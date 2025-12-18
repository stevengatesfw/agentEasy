import json
import logging
import os
import re
import time
import uuid

import requests
from flask import Response, stream_with_context
from flask_login import current_user
from flask_restful import reqparse

from core.restful import Resource
from libs.helper import build_response
from parts.app.node_run.app_run_service import AppRunService
from parts.app.node_run.event_serializer import EventSerializer
from parts.app.node_run.run_context import RunContext
from parts.inferservice.model import InferModelService
from parts.inferservice.service import InferService
from parts.urls import api


class TestSpeakToApi(Resource):
    """测试对话API控制器。

    提供推理服务的测试对话功能。
    """

    def post(self, service_id):
        """处理POST请求，测试推理服务对话。

        验证服务存在性，解析输入参数，执行流式对话测试。

        Args:
            service_id (str): 服务ID。

        Returns:
            Response: 流式响应对象。

        Raises:
            ValueError: 当服务不存在时抛出异常。
        """

        # 前端可能传入数据库ID(数字字符串)或服务名(如 v1/v2)。
        service = InferModelService.query.get(service_id)
        if not service:
            # 尝试按服务名兜底（同租户优先）
            try:
                tenant_id = getattr(current_user, "current_tenant_id", None)
                query = InferModelService.query.filter_by(name=str(service_id))
                if tenant_id:
                    query = query.filter_by(tenant_id=str(tenant_id))
                service = query.order_by(InferModelService.id.desc()).first()
            except Exception:
                service = None

        # 如果服务不存在，返回真实的 HTTP 错误码（避免前端把 JSON 当 SSE 流解析导致“正在回答”卡住）
        if not service:
            return build_response(status=404, message="Service not found"), 404
        # 下游逻辑依赖数据库中的服务ID；如果前端传的是服务名(v1/v2)，这里要转换为真实ID
        infer_service = InferService()
        resolved_service_id = str(service.id) if service else str(service_id)
        service_info = infer_service.get_infer_model_service_by_id(resolved_service_id)
        logging.info(f"TestSpeakToApi, service_info: {service_info}")

        parser = reqparse.RequestParser()
        parser.add_argument(
            "inputs", type=list, required=True, nullable=False, location="json"
        )
        parser.add_argument(
            "files", type=list, required=False, nullable=True, location="json"
        )
        args = parser.parse_args()
        inputs = args["inputs"]
        files = args.get("files") or []

        history_list = []
        manager = RunTestManager(service_info=service_info)
        return manager.stream_run(inputs, files, history_list)


class RunTestManager:
    """测试运行管理器。

    管理推理服务的测试运行流程。
    """

    def __init__(self, service_info=None):
        """初始化测试运行管理器。

        Args:
            service_info (dict, optional): 服务信息字典。

        Returns:
            None: 无返回值。
        """
        self.service_info = service_info
        logging.info(f"RunTestManager, service_info: {self.service_info}")

    def build_test_workflow(self, run_node_id):
        """构建测试工作流。

        根据服务信息构建测试用的工作流配置。

        Args:
            run_node_id (str): 运行节点ID。

        Returns:
            dict: 工作流图配置。

        Raises:
            FileNotFoundError: 当找不到测试配置文件时抛出异常。
        """
        current_file_path = os.path.dirname(os.path.abspath(__file__))
        test_llm_json_path = os.path.join(current_file_path, "test_llm.json")
        workflow = json.load(open(test_llm_json_path))

        workflow["graph"]["nodes"][2]["data"]["payload__base_model"] = (
            self.service_info["model_name"]
        )
        workflow["graph"]["nodes"][2]["data"]["payload__type"] = "local"
        workflow["graph"]["nodes"][2]["data"]["payload__url"] = self.service_info["url"]
        workflow["graph"]["nodes"][2]["data"]["payload__deploy_method"] = (
            self.service_info["framework"]
        )
        # OCR/RelayServer 返回通常不是可流式拼接的文本（会是 base64(pickle)），打开 stream 会导致前端先收到一堆 chunk“代码”。
        # 因此针对 OCR 类框架在模型测试里强制关闭 stream，等 result/finish 再一次性输出。
        try:
            fw = str(self.service_info.get("framework") or "").lower()
            if fw in {"deepseekocrdeploy", "ocrdeploy"}:
                workflow["graph"]["nodes"][2]["data"]["payload__stream"] = False
        except Exception:
            pass
        workflow["graph"]["nodes"][2]["id"] = run_node_id
        logging.info(f"llm_node: {workflow['graph']['nodes'][2]}")
        return workflow["graph"]

    def stream_run(self, inputs, files, history):
        """执行流式运行测试。

        创建应用运行服务，执行流式对话测试。

        Args:
            inputs (list): 输入参数列表。
            files (list): 文件列表。
            history (list): 对话历史列表。

        Returns:
            Response: 流式响应对象。

        Raises:
            Exception: 当运行测试失败时抛出异常。
        """
        logging.info(f"LightEngine stream_run: inputs={inputs}, files={files}")

        # 对 OCR/RelayServer 类框架，直接调用推理服务 endpoint，避免 workflow/TrainableModule
        # 在参数封装上产生不兼容（用户侧出现的 DeepSeekOCRDeploy: inputs is required）。
        try:
            fw = str((self.service_info or {}).get("framework") or "").lower()
        except Exception:
            fw = ""

        if fw in {"deepseekocrdeploy", "ocrdeploy"} and self.service_info and self.service_info.get("url"):
            infer_url = self.service_info["url"]

            def _decode_relay_base64_pickle(s: str) -> str:
                if not isinstance(s, str):
                    return str(s)
                try:
                    import base64 as _b64
                    import pickle as _pickle

                    obj = _pickle.loads(_b64.b64decode(s))
                    if isinstance(obj, bytes):
                        return obj.decode("utf-8", errors="ignore")
                    if isinstance(obj, str):
                        return obj
                    return str(obj)
                except Exception:
                    return s

            def _to_plain_text(s: str) -> str:
                """
                DeepSeek-OCR 会输出带标注的文本：
                <|ref|>...<|/ref|><|det|>[[...]]<|/det|> TEXT ...
                这里将 ref/det 片段剔除，仅保留纯文本。
                """
                if not isinstance(s, str):
                    return str(s)
                # 移除 <|ref|>xxx<|/ref|> 与 <|det|>[[...]]<|/det|>
                s = re.sub(r"<\|ref\|>.*?<\|/ref\|>", "", s, flags=re.DOTALL)
                s = re.sub(r"<\|det\|>\s*\[\[.*?\]\]\s*<\|/det\|>", "", s, flags=re.DOTALL)
                # 合并多余空白与空行
                lines = [ln.strip() for ln in s.splitlines()]
                lines = [ln for ln in lines if ln]
                return "\n".join(lines).strip()

            def _extract_file_paths(file_items):
                paths = []
                for it in file_items or []:
                    if isinstance(it, str):
                        paths.append(it)
                    elif isinstance(it, dict):
                        # 前端模型测试上传后：{id, value, type}
                        if it.get("value"):
                            paths.append(it["value"])
                        # 兼容少量场景：{url:"/app/upload/temp/..."}
                        elif it.get("url"):
                            paths.append(it["url"])
                return [p for p in paths if p]

            query = ""
            if isinstance(inputs, list) and inputs:
                query = str(inputs[0] or "")

            file_paths = _extract_file_paths(files)
            payload_str = json.dumps({"query": query, "files": file_paths}, ensure_ascii=False)

            def generate():
                yield EventSerializer.sse_message(
                    {
                        "flow_type": "infer_test",
                        "event": "start",
                        "timestamp": time.time(),
                        "data": {
                            "inputs": inputs,
                            "input_files": files,
                            "extras": {"framework": (self.service_info or {}).get("framework"), "mode": "direct"},
                        },
                    }
                )
                try:
                    r = requests.post(infer_url, json=payload_str, timeout=240)
                    if r.status_code != 200:
                        yield EventSerializer.sse_message(
                            {
                                "flow_type": "infer_test",
                                "event": "finish",
                                "timestamp": time.time(),
                                "data": {
                                    "status": "failed",
                                    "error": {
                                        "simple_error": (r.text or "")[:400],
                                        "detail_error": (r.text or "")[:2000],
                                    },
                                },
                            }
                        )
                    else:
                        decoded = _decode_relay_base64_pickle(r.text)
                        decoded = _to_plain_text(decoded)
                        yield EventSerializer.sse_message(
                            {
                                "flow_type": "infer_test",
                                "event": "finish",
                                "timestamp": time.time(),
                                "data": {"status": "succeeded", "outputs": decoded},
                            }
                        )
                except Exception as e:
                    yield EventSerializer.sse_message(
                        {
                            "flow_type": "infer_test",
                            "event": "finish",
                            "timestamp": time.time(),
                            "data": {
                                "status": "failed",
                                "error": {"simple_error": str(e), "detail_error": str(e)},
                            },
                        }
                    )
                finally:
                    yield EventSerializer.sse_message(
                        {"flow_type": "infer_test", "event": "stop", "timestamp": time.time(), "data": None}
                    )

            return Response(stream_with_context(generate()), status=200, mimetype="text/event-stream")

        app_id = str(uuid.uuid4())
        run_node_id = str(int(time.time() * 1000))
        run_context = RunContext(app_id=app_id, run_node_id=run_node_id)
        app_run_service = AppRunService(run_context)
        app_run_service.start(self.build_test_workflow(run_node_id))
        raw_generator = app_run_service.run_stream(
            inputs,
            input_files=files,
            chat_history=history,
            account=current_user,
            stop_engine=True,
        )

        # RelayServer 的 /generate 默认返回 base64(pickle.dumps(obj))，前端无法解析会显示乱码/报错。
        # 这里在模型测试链路中做一次解码，将 outputs 还原为可读文本。
        def _maybe_decode_relay_output(value):
            if not isinstance(value, str):
                return value
            # 常见 base64 pickle 头：gAS...
            if not value.startswith("gAS"):
                return value
            try:
                import base64 as _b64
                import pickle as _pickle

                obj = _pickle.loads(_b64.b64decode(value))
                if isinstance(obj, bytes):
                    try:
                        return obj.decode("utf-8", errors="ignore")
                    except Exception:
                        return str(obj)
                if isinstance(obj, str):
                    return obj
                # 兜底：转字符串（避免前端出现 [object Object]）
                return str(obj)
            except Exception:
                return value

        def _wrap_generator():
            for line in raw_generator:
                if not isinstance(line, str) or not line.startswith("data: "):
                    yield line
                    continue
                try:
                    payload = json.loads(line[len("data: ") :].strip())
                except Exception:
                    yield line
                    continue

                event = payload.get("event")
                data = payload.get("data")

                # 处理 result / finish 的输出字段
                if event == "result":
                    payload["data"] = _maybe_decode_relay_output(data)
                    yield EventSerializer.sse_message(payload)
                    continue
                if event == "finish" and isinstance(data, dict):
                    if "outputs" in data:
                        data["outputs"] = _maybe_decode_relay_output(data.get("outputs"))
                    payload["data"] = data
                    yield EventSerializer.sse_message(payload)
                    continue

                yield line

        generator = _wrap_generator()
        return Response(
            stream_with_context(generator), status=200, mimetype="text/event-stream"
        )


api.add_resource(TestSpeakToApi, "/infer-service/test/<string:service_id>/run")
