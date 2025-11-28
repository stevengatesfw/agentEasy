from utils.util_database import db


class OperationLog(db.Model):
    """操作日志模型，用于记录用户的操作记录。

    该模型用于存储用户在系统中进行的各种操作，包括操作模块、
    具体动作、详细信息和时间等，便于系统审计和日志追踪。

    Attributes:
        id (int): 日志记录的唯一标识符。
        user_id (str): 用户的唯一标识符。
        module (str): 操作的模块名称。
        action (str): 操作的具体动作。
        details (str): 操作的详细信息。
        created_at (datetime): 记录创建时间，默认为当前UTC时间。
    """

    __tablename__ = "operation_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    module = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.now())
