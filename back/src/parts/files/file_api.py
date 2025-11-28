import os

from flask_restful import reqparse
from werkzeug.datastructures import FileStorage

from core.restful import Resource
from libs.filetools import FileTools
from parts.urls import api

LAZYLLM_UPLOAD_PATH = os.environ.get("LAZYLLM_UPLOAD_PATH", "")


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


api.add_resource(AppFileUploadApi, "/files/upload")  # 文件上传
