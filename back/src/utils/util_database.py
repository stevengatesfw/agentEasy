from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData

POSTGRES_INDEXES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

MYSQL_INDEXES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(column_0_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

metadata = MetaData(naming_convention=MYSQL_INDEXES_NAMING_CONVENTION)
# metadata = MetaData(naming_convention=POSTGRES_INDEXES_NAMING_CONVENTION)
db = SQLAlchemy(metadata=metadata)


def init_app(app):
    """初始化数据库扩展。

    使用 Flask 应用的配置初始化 SQLAlchemy 数据库连接。
    会打印数据库连接 URI 用于调试，然后初始化数据库。

    Args:
        app: Flask 应用实例，包含数据库连接配置信息。
             需要包含 SQLALCHEMY_DATABASE_URI 配置项。
    """
    print("SQLALCHEMY_DATABASE_URI:", app.config.get("SQLALCHEMY_DATABASE_URI"))
    db.init_app(app)
