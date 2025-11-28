import lazyllm

# 初始化大语言模型
llm = lazyllm.OnlineChatModule()

TASK_DESCRIPTION = "请识别文本中的谓词及其对应的语义角色"


def semantic_role_labeling(item):
    """
    处理单条 Alpaca 格式数据，返回带有 output 的新数据。

    参数：
        item (dict): 包含 instruction 和 input 的数据项。

    返回：
        dict: 包含 output 的数据项。
    """
    try:
        user_input = item.get("input", "")
        item["instruction"] = TASK_DESCRIPTION

        if not user_input.strip():
            return None

        # 拼接 query 并调用模型
        query = f"{TASK_DESCRIPTION}\n{user_input}"
        result = llm(query)
        item["output"] = result if isinstance(result, str) else result.get("text", "")
    except Exception as e:
        print(f"semantic_role_labeling error: {e}")
        return None
    return item
