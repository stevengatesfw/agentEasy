import flask_migrate


def init(app, db):
    """初始化数据库迁移扩展。

    使用 Flask-Migrate 初始化数据库迁移功能，提供数据库版本控制和迁移管理。

    Args:
        app: Flask 应用实例。
        db: SQLAlchemy 数据库实例。
    """
    flask_migrate.Migrate(app, db)
