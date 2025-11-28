from .model import WorkflowRefer


class ReferManager:
    """引用管理器类。

    用于管理和检查各种资源（应用、模型、工具、MCP、知识库等）
    是否被工作流引用的工具类。
    """

    @classmethod
    def _base_exists(cls, _type, _id):
        """检查指定类型和ID的资源是否被引用。

        基础方法，检查指定类型和ID的资源是否在工作流中被引用。

        Args:
            _type (str): 资源类型。
            _id (int|str): 资源ID。

        Returns:
            WorkflowRefer|bool: 如果被引用则返回引用实例，否则返回False。

        Raises:
            None
        """
        instance = WorkflowRefer.query.filter_by(
            target_type=_type, target_id=str(_id)
        ).first()
        if instance:
            return instance
        else:
            return False

    @classmethod
    def is_app_refered(cls, _id):
        """检查应用是否被引用。

        Args:
            _id (int|str): 应用ID。

        Returns:
            WorkflowRefer|bool: 如果被引用则返回引用实例，否则返回False。

        Raises:
            None
        """
        return cls._base_exists("app", _id)

    @classmethod
    def is_model_refered(cls, _id):
        """检查模型是否被引用。

        Args:
            _id (int|str): 模型ID。

        Returns:
            WorkflowRefer|bool: 如果被引用则返回引用实例，否则返回False。

        Raises:
            None
        """
        return cls._base_exists("model", _id)

    @classmethod
    def is_tool_refered(cls, _id):
        """检查工具是否被引用。

        Args:
            _id (int|str): 工具ID。

        Returns:
            WorkflowRefer|bool: 如果被引用则返回引用实例，否则返回False。

        Raises:
            None
        """
        return cls._base_exists("tool", _id)

    @classmethod
    def is_mcp_refered(cls, _id):
        """检查MCP服务是否被引用。

        Args:
            _id (int|str): MCP服务ID。

        Returns:
            WorkflowRefer|bool: 如果被引用则返回引用实例，否则返回False。

        Raises:
            None
        """
        return cls._base_exists("mcp", _id)

    @classmethod
    def is_knowledge_refered(cls, _id):
        """检查知识库是否被引用。

        Args:
            _id (int|str): 知识库ID。

        Returns:
            WorkflowRefer|bool: 如果被引用则返回引用实例，否则返回False。

        Raises:
            None
        """
        return cls._base_exists("document", _id)
