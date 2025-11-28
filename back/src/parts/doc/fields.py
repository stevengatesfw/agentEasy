from flask_restful import fields

from libs.fields import CustomDateTime

tag_fields = {"id": fields.String, "name": fields.String, "type": fields.String}
account_fields = {"id": fields.String, "name": fields.String, "avatar": fields.String}

doc_detail_fields = {
    "id": fields.Integer,
    "title": fields.String,
    "doc_content": fields.String,
    "index": fields.String,
    "status": fields.String,
    "status_label": fields.String,
    "created_by": fields.String,
    "created_by_account": fields.Nested(account_fields, attribute="created_by_account"),
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
}

doc_page_fields = {
    "page": fields.Integer,
    "limit": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(doc_detail_fields), attribute="items"),
}
