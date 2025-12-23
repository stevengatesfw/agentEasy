import os
import mimetypes
import logging

from flask import send_file
from flask_restful import reqparse
from werkzeug.datastructures import FileStorage

from core.restful import Resource
from libs.filetools import FileTools
from parts.urls import api

LAZYLLM_UPLOAD_PATH = os.environ.get("LAZYLLM_UPLOAD_PATH", "")
logger = logging.getLogger(__name__)


class AppFileUploadApi(Resource):
    def post(self):
        """上传本地文件供大模型使用。

        此端点允许在不需要身份验证的情况下上传文件，
        因为访客也可以访问。上传的文件会保存到工作流目录中，
        并使用随机生成的文件名。

        Args:
            None (使用Flask请求解析器从表单数据获取文件)

        Returns:
            dict: 包含已上传文件路径的字典。
                  示例: {"file_path": "/path/to/uploaded/file.txt"}

        Raises:
            werkzeug.exceptions.BadRequest: 当请求中未提供文件时抛出。
            OSError: 当创建存储目录或保存文件时出现问题时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("file", type=FileStorage, required=True, location="files")
        uploaded_file = parser.parse_args()["file"]

        storage_dir = os.path.join(LAZYLLM_UPLOAD_PATH, "workflow")

        if not os.path.exists(storage_dir):
            os.makedirs(storage_dir, exist_ok=True)

        filename = FileTools.random_filename(uploaded_file)
        file_path = os.path.join(storage_dir, filename)
        uploaded_file.save(file_path)
        return {"file_path": file_path}


class AppFileDownloadApi(Resource):
    def get(self):
        """下载文件。

        此端点允许通过文件路径下载文件，包括/tmp路径下的文件。
        用于访问应用生成的文件，如视频、音频等。

        Args:
            file_path (str): 文件路径，通过查询参数传递

        Returns:
            Response: 文件下载响应

        Raises:
            ValueError: 当文件路径为空或文件不存在时抛出异常
        """
        parser = reqparse.RequestParser()
        parser.add_argument("file_path", type=str, required=True, location="args")
        args = parser.parse_args()
        file_path = args["file_path"]
        
        logger.info(f"文件下载请求: {file_path}")
        
        if not file_path:
            raise ValueError("文件路径不能为空")
        
        # 安全检查：只允许访问/tmp和/app/upload路径下的文件
        if not (file_path.startswith("/tmp/") or file_path.startswith("/app/upload/")):
            raise ValueError("不允许访问该路径的文件")
        
        # 检查文件是否存在（考虑大小写）
        if not os.path.exists(file_path):
            # 尝试查找相似的文件名（处理大小写问题）
            if file_path.startswith("/tmp/"):
                dir_path = "/tmp"
                filename = os.path.basename(file_path)
                try:
                    # 列出目录中的所有文件，查找匹配的文件（忽略大小写）
                    if os.path.exists(dir_path):
                        files = os.listdir(dir_path)
                        matching_files = [f for f in files if f.lower() == filename.lower()]
                        if matching_files:
                            actual_file = os.path.join(dir_path, matching_files[0])
                            logger.info(f"找到大小写不同的文件: {file_path} -> {actual_file}")
                            file_path = actual_file
                        else:
                            logger.warning(f"文件不存在: {file_path}, 目录中的文件: {files[:10]}")
                            raise ValueError(f"文件 {file_path} 不存在")
                except Exception as e:
                    logger.error(f"查找文件时出错: {e}")
                    raise ValueError(f"文件 {file_path} 不存在")
            else:
                logger.warning(f"文件不存在: {file_path}")
                raise ValueError(f"文件 {file_path} 不存在")
        
        if not os.path.isfile(file_path):
            raise ValueError(f"{file_path} 不是一个文件")
        
        logger.info(f"文件找到，准备发送: {file_path}")
        
        try:
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type is None:
                # 根据文件扩展名判断MIME类型
                ext = os.path.splitext(file_path)[1].lower()
                mime_map = {
                    '.mp4': 'video/mp4',
                    '.avi': 'video/x-msvideo',
                    '.mov': 'video/quicktime',
                    '.wmv': 'video/x-ms-wmv',
                    '.flv': 'video/x-flv',
                    '.webm': 'video/webm',
                    '.mkv': 'video/x-matroska',
                }
                mime_type = mime_map.get(ext, "application/octet-stream")
            
            download_name = os.path.basename(file_path)
            
            # 使用send_file，Flask会自动处理Range请求（视频播放需要）
            response = send_file(
                file_path,
                as_attachment=False,  # 不强制下载，允许浏览器直接播放
                download_name=download_name,
                mimetype=mime_type,
            )
            
            # 添加CORS头，确保跨域访问
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Range'
            response.headers['Accept-Ranges'] = 'bytes'
            
            return response
        except Exception as e:
            return {"error": str(e)}, 500


api.add_resource(AppFileUploadApi, "/files/upload")  # 文件上传
api.add_resource(AppFileDownloadApi, "/files/download")  # 文件下载
