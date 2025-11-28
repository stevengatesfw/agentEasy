from typing import Optional

from werkzeug.exceptions import HTTPException


class BaseHTTPError(HTTPException):
    """基础 HTTP 异常类。

    继承自 Werkzeug 的 HTTPException，提供标准化的错误响应格式。
    包含错误代码、消息和状态码等信息。

    Attributes:
        error_code (str): 错误代码标识符。
        data (Optional[dict]): 错误响应数据。
    """

    error_code: str = "unknown"
    data: Optional[dict] = None

    def __init__(self, description=None, response=None):
        """初始化基础 HTTP 异常。

        创建标准化的错误响应数据结构。

        Args:
            description: 错误描述信息。
            response: HTTP 响应对象。
        """
        super().__init__(description, response)

        self.data = {
            "code": self.error_code,
            "message": self.description,
            "status": self.code,
        }


class CommonError(BaseHTTPError):
    """通用错误异常。

    用于表示一般性的业务逻辑错误，HTTP 状态码为 400。
    """

    error_code = "normal_error"
    code = 400
