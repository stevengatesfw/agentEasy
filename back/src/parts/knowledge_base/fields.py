from flask_restful import fields

from libs.fields import CustomDateTime

knowledge_base_fields = {
    "id": fields.String,
    "name": fields.String,
    "description": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "path": fields.String,
    "user_name": fields.String,  # 用户名
    "user_id": fields.String,  # 用户id
    "tags": fields.List(fields.String, attribute="tags"),
    "ref_status": fields.Boolean,
}

knowledge_pagination_fields = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(knowledge_base_fields), attribute="items"),
}

file_fields = {
    "id": fields.String,
    "name": fields.String,
    "size": fields.Integer,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "file_type": fields.String,
    "file_path": fields.String,
    "file_md5": fields.String,
    "user_id": fields.String,
    "storage_type": fields.String,
    "knowledge_base_id": fields.String,
    "used": fields.Boolean,
}

file_pagination_fields = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(file_fields), attribute="items"),
}

file_list_fields = {
    "files": fields.List(fields.Nested(file_fields)),
}

app_ref_fields = {
    "id": fields.String,
    "name": fields.String,
    "is_public": fields.Boolean,
}
