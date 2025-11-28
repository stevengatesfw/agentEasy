from flask_restful import fields

from libs.fields import CustomDateTime

online_model_fields = {
    "id": fields.String,
    "model_name": fields.String,
    "model_key": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "parent_id": fields.String,
    "source_info": fields.String,
    "model_id": fields.String,
    "finetune_task_id": fields.Integer,
    "can_finetune": fields.Boolean,
}

model_name_fields = {
    "is_finetune_model": fields.Boolean,
    "model_name": fields.String,
    "model_key": fields.String,
}

model_fields = {
    "id": fields.String,
    "description": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "model_icon": fields.String,
    "model_type": fields.String,
    "model_name": fields.String,
    "model_path": fields.String,
    "model_from": fields.String,
    "model_kind": fields.String,
    "model_kind_display": fields.String,
    "model_key": fields.String,
    "model_status": fields.String,
    "prompt_keys": fields.String,
    "model_brand": fields.String,
    "model_url": fields.String,
    "model_list": fields.List(fields.Nested(model_name_fields), attribute="model_list"),
    "user_id": fields.String,
    "model_dir": fields.String,
    "api_key": fields.String,
    "download_message": fields.String,
    "tags": fields.List(fields.String, attribute="tags"),
    "user_name": fields.String,
    "framework": fields.String,
    "endpoint": fields.String,
}

model_select_fields = {
    "id": fields.String,
    "model_icon": fields.String,
    "model_type": fields.String,
    "model_name": fields.String,
    "model_kind": fields.String,
    "model_key": fields.String,
    "prompt_keys": fields.String,
    "model_brand": fields.String,
    "model_url": fields.String,
    "can_finetune": fields.Boolean,
    "val_key": fields.String,
    "proxy_url": fields.String,
}

model_pagination_fields = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(model_fields), attribute="items"),
}

finetune_model_fields = {
    "id": fields.String,
    "description": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "model_name": fields.String,
    "model_key": fields.String,
    "source_info": fields.String,
    "finetune_task_id": fields.Integer,
    "model_status": fields.String,
}

finetune_pagination_fields = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(finetune_model_fields), attribute="items"),
}
