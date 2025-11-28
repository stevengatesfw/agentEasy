from flask_restful import fields

from libs.fields import CustomDateTime

# MCP 服务器相关字段
mcp_server_detail = {
    "id": fields.Integer,
    "name": fields.String,
    "description": fields.String,
    "icon": fields.String,
    "transport_type": fields.String,
    "timeout": fields.Integer,
    "stdio_command": fields.String,
    "stdio_arguments": fields.String,
    "stdio_env": fields.Raw,
    "http_url": fields.String,
    "headers": fields.Raw,
    "sync_tools_at": CustomDateTime,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "publish_at": CustomDateTime,
    "user_id": fields.String,
    "user_name": fields.String,
    "tenant_id": fields.String,
    "publish": fields.Boolean,
    "publish_type": fields.String,
    "enable": fields.Boolean,
    "test_state": fields.String,
    "tags": fields.List(fields.String, attribute="tags"),
    "ref_status": fields.Boolean,
}

mcp_server_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(mcp_server_detail), attribute="items"),
}

# MCP 工具相关字段
mcp_tool_detail = {
    "id": fields.Integer,
    "mcp_server_id": fields.Integer,
    "name": fields.String,
    "description": fields.String,
    "input_schema": fields.Raw,
    "additional_properties": fields.Raw,
    "annotations": fields.Raw,
    "schema": fields.String,
    "status": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
}

mcp_tool_list = {
    "data": fields.List(fields.Nested(mcp_tool_detail)),
}

app_ref_fields = {
    "id": fields.String,
    "name": fields.String,
    "is_public": fields.Boolean,
}
