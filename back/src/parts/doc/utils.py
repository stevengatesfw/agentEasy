import mimetypes


def get_content_type(file_name):
    """根据文件名获取文件的 MIME 类型。

    Args:
        file_name (str): 文件名，包含扩展名

    Returns:
        str: 文件的 MIME 类型

    Note:
        如果无法通过 mimetypes 模块自动识别文件类型，会手动处理常见的文件扩展名
    """
    mime_type, _ = mimetypes.guess_type(file_name)

    # 如果无法通过 mimetypes 得到类型，可以手动添加处理
    if mime_type is None:
        # 手动处理常见文件类型（如应用程序二进制文件）
        extension = file_name.split(".")[-1].lower()
        if extension == "jpg" or extension == "jpeg":
            return "image/jpeg"
        elif extension == "png":
            return "image/png"
        elif extension == "gif":
            return "image/gif"
        elif extension == "txt":
            return "text/plain"
        elif extension == "html":
            return "text/html"
        elif extension == "json":
            return "application/json"
        elif extension == "xml":
            return "application/xml"
        else:
            return "application/octet-stream"  # 默认二进制流文件
    return mime_type
