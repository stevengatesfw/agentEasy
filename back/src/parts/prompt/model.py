from sqlalchemy.sql import func

from models.model_account import Account
from parts.tag.model import Tag
from utils.util_database import db


class Prompt(db.Model):
    __tablename__ = "prompts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255))
    tenant_id = db.Column(db.String(36))
    name = db.Column(db.String(255), nullable=False)
    describe = db.Column(db.String(1024))
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

    @property
    def creator(self):
        return Account.query.filter_by(id=self.user_id).first().name

    @property
    def tags(self):
        return Tag.get_names_by_target_id(Tag.Types.PROMPT, self.id)

    # def __init__(self, name, describe, content,template_id,category):
    #     self.name = name
    #     self.describe = describe
    #     self.content = content
    #     self.template_id = template_id
    #     self.category = category
