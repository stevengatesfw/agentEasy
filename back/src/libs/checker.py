class NestedChecker:
    """嵌套层级死循环检测器。

    用于检测应用嵌套结构中是否存在死循环。通过跟踪不同层级的应用 ID，
    防止应用引用自身或形成循环引用。

    Attributes:
        level_map_ids (dict): 层级到应用 ID 列表的映射。
    """

    def __init__(self):
        """初始化嵌套检测器。

        创建空的层级映射字典。
        """
        self.level_map_ids = {}

    def add_level(self, level, app_id):
        """添加层级和应用 ID。

        在指定层级添加应用 ID，添加前会先检查是否存在死循环。

        Args:
            level (int): 层级深度。
            app_id: 应用 ID。

        Raises:
            ValueError: 当检测到死循环时抛出。
        """
        self.check_level(level, app_id)

        if level not in self.level_map_ids:
            self.level_map_ids[level] = []
        self.level_map_ids[level].append(app_id)

    def check_level(self, level, app_id):
        """检查指定层级是否存在死循环。

        检查当前应用 ID 是否已经在之前的层级中出现，如果出现则说明存在死循环。

        Args:
            level (int): 当前层级深度。
            app_id: 要检查的应用 ID。

        Raises:
            ValueError: 当检测到死循环时抛出，包含详细的错误信息。
        """
        if level > 0:
            for i in range(0, level):
                if i in self.level_map_ids.keys() and app_id in self.level_map_ids[i]:
                    raise ValueError(
                        f"{self._map_name(i)}与{self._map_name(level)}形成了死循环"
                    )

    def _map_name(self, level):
        """将层级数字映射为友好的名称。

        将层级深度转换为易于理解的中文描述。

        Args:
            level (int): 层级深度。

        Returns:
            str: 层级的中文描述。
        """
        if level == 0:
            return "应用自己"
        elif level == 1:
            return "主画布"
        else:
            return f"第{level}层子画布"
