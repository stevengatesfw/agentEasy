from flask_restful import fields

from libs.fields import CustomDateTime

apikey_detail_fields = {
    "id": fields.String,
    "user_id": fields.String,
    "user_name": fields.String,
    "tenant_list": fields.String,  # Changed to List of Strings for multiple tenant IDs
    "api_key": fields.String,
    "description": fields.String,
    "status": fields.String,
    "expire_date": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
}
