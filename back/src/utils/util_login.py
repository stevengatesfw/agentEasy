import flask_login

login_manager = flask_login.LoginManager()


def init_app(app):
    """初始化登录管理器。

    使用 Flask-Login 初始化用户会话管理功能，提供用户登录、注销和会话管理。

    Args:
        app: Flask 应用实例。
    """
    login_manager.init_app(app)
