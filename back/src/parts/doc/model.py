from enum import Enum

from models import StringUUID
from models.model_account import Account
from utils.util_database import db


class DocStatus(Enum):
    """文档状态枚举类。

    定义了文档的三种状态：草稿、未发布、已发布
    """

    DRAFT = "draft"  # 草稿
    UNPUBLISH = "unpublish"  # 下架
    PUBLISH = "publish"  # 上架

    @property
    def display(self):
        """获取状态的中文显示名称。

        Returns:
            str: 状态的中文显示名称
        """
        translations = {
            DocStatus.DRAFT: "草稿",
            DocStatus.UNPUBLISH: "未发布",
            DocStatus.PUBLISH: "已发布",
        }
        return translations[self]


class Documents(db.Model):
    """文档数据模型类。

    定义了文档在数据库中的表结构和相关属性
    """

    __tablename__ = "documents"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(StringUUID, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    index = db.Column(db.Integer, nullable=False)
    doc_content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    deleted_flag = db.Column(db.Integer, nullable=False, default=0)
    created_by = db.Column(StringUUID, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    __table_args__ = (db.PrimaryKeyConstraint("id", name="doc_pkey"),)

    @property
    def created_by_account(self):
        """获取创建文档的账户信息。

        Returns:
            Account: 创建文档的账户对象
        """
        return db.session.get(Account, self.created_by)

    @property
    def status_label(self):
        """获取文档状态的中文标签。

        Returns:
            str: 文档状态的中文显示名称
        """
        return DocStatus(self.status).display
