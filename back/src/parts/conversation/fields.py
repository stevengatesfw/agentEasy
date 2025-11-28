from flask_restful import fields

from libs.helper import TimestampField

# 对话字段定义
speak_fields = {
    "id": fields.Integer,
    "from_who": fields.String,
    "content": fields.String,
    "turn_number": fields.Integer,
    "files": fields.List(fields.String, attribute="files_as_list"),
    "created_at": TimestampField,
    "is_satisfied": fields.Boolean,
    "user_feedback": fields.String,
}
