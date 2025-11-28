def ensure_list_from_json(json_value):
    """
    确保从JSON字段获取的值是列表类型
    Args:
        json_value: 从数据库JSON字段获取的值
    Returns:
        list: 确保是列表类型的值
    """
    if json_value is None:
        return []
    elif isinstance(json_value, list):
        return json_value
    elif isinstance(json_value, (str, int, float)):
        # 如果是单个值，转换为列表
        return [json_value]
    else:
        # 其他类型（如dict等）返回空列表
        return []
