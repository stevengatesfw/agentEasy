from app import app
from parts.app.model import App, AppTemplate, Workflow
from parts.models_hub.model import Lazymodel
from utils.util_database import db


def main():
    """修复本地模型路径配置。

    将所有本地模型中以 "/root/.lazyllm" 开头的 model_path 字段
    修改为对应的 model_key 值。这通常用于修复模型路径配置错误。
    """
    with app.app_context():
        queryset = Lazymodel.query.filter_by(model_type="local")
        for item in queryset:
            if item.model_path.startswith("/root/.lazyllm"):
                item.model_path = item.model_key
        db.session.commit()


def main2():
    """修复工作流的主应用ID字段。

    遍历所有应用和应用模板，为其对应的草稿版本和发布版本工作流
    设置正确的 main_app_id 字段值。

    这个函数修复工作流数据结构中可能缺失的主应用ID关联。
    """
    with app.app_context():
        app_queryset = App.query.all()
        tmpl_queryset = AppTemplate.query.all()
        for queryset in [app_queryset, tmpl_queryset]:
            for item in queryset:
                for version in ["draft", "publish"]:
                    workflow = Workflow.default_getone(item.id, version)
                    if workflow:
                        workflow.main_app_id = workflow.app_id
                        print(f"update workflow: {workflow.app_id} {version}")
                        db.session.commit()


main2()
