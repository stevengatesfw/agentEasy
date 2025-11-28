from dataclasses import dataclass
from typing import Literal


@dataclass
class RunContext:
    """运行时上下文配置类。

    用于存储和管理应用运行时的上下文信息。
    """

    app_id: str
    mode: Literal["draft", "publish", "node"] = "draft"
    app_name: str = ""
    run_node_id: str = None
    enable_backflow: bool = False
    report_url: str = "http://localhost:8087/console/api/app/report"
    auto_server: bool = False
