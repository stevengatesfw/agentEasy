from flask_restful import fields

from libs.fields import CustomDateTime

script_field = {
    "id": fields.String,
    "name": fields.String,
    "description": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "user_id": fields.String,
    "user_name": fields.String,
    "script_url": fields.String,
    "script_type": fields.String,
    "upload_status": fields.String,
    "data_type": fields.String,
}

script_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(script_field), attribute="items"),
}

data_set_field = {
    "id": fields.String,
    "name": fields.String,
    "description": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "last_sync_at": CustomDateTime,
    "user_id": fields.String,
    "user_name": fields.String,
    "data_set_url": fields.String,
    "label": fields.List(fields.String),
    "tags": fields.List(fields.String),
    "data_type": fields.String,
    "data_format": fields.String,
    "upload_type": fields.String,
    "from_type": fields.String,
    "file_urls": fields.List(fields.String),
    "file_paths": fields.List(fields.String),
    "data_set_file_ids": fields.List(fields.Integer),
    "tags_num": fields.Integer,
    "branches_num": fields.Integer,
    "reflux_type": fields.String,
}

data_set_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(data_set_field), attribute="items"),
}

data_set_version_field = {
    "id": fields.String,
    "name": fields.String,
    "version": fields.String,
    "data_set_id": fields.Integer,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "user_id": fields.String,
    "status": fields.String,
    "is_original": fields.String,
    "data_set_file_ids": fields.List(fields.Integer),
    "version_type": fields.String,
    "is_published": fields.Boolean,
    "version_path": fields.String,
    "previous_version_id": fields.Integer,
    # data_set_fields
    "description": fields.String,
    "label": fields.List(fields.String),
    "tags": fields.List(fields.String),
    "user_name": fields.String,
    "data_type": fields.String,
    "data_format": fields.String,
    "from_type": fields.String,
    "reflux_type": fields.String,
}

data_set_version_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(data_set_version_field), attribute="items"),
}

data_set_file_field = {
    "id": fields.Integer,
    "name": fields.String,
    "path": fields.String,
    "download_url": fields.String,
    "status": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "data_set_id": fields.Integer,
    "data_set_version_id": fields.Integer,
    "user_id": fields.String,
    "operation": fields.String,
    "finished_at": CustomDateTime,
    "file_type": fields.String,
    "error_msg": fields.String,
}

data_set_file_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(data_set_file_field), attribute="items"),
}

data_set_tag_list_fields = {"data": fields.List(fields.Nested(data_set_version_field))}

reflux_data_field = {
    "id": fields.Integer,
    "data_set_id": fields.Integer,
    "data_set_version_id": fields.Integer,
    "app_id": fields.String,
    "app_name": fields.String,
    "module_id": fields.String,
    "module_name": fields.String,
    "module_type": fields.String,
    "output_time": CustomDateTime,
    "module_input": fields.String,
    "module_output": fields.String,
    "conversation_id": fields.String,
    "turn_number": fields.String,
    "is_satisfied": fields.String,
    "user_feedback": fields.String,
    "status": fields.String,
    "operation": fields.String,
    "finished_at": fields.String,
    "error_msg": fields.String,
    "user_id": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
}

reflux_data_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(reflux_data_field), attribute="items"),
}

reflux_data_show_field = {
    "app_name": fields.String,
    "module_info": {
        "module_name": fields.String,
        "module_type": fields.String,
        "output_time": CustomDateTime,
        "module_input": fields.String,
        "module_output": fields.String,
    },
    "conversation_info": {
        "conversation_id": fields.String,
        "turn_number": fields.String,
        "is_satisfied": fields.String,
        "user_feedback": fields.String,
    },
}
