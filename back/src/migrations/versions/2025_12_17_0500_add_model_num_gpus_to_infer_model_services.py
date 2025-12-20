"""add model_num_gpus to infer_model_services

Revision ID: 2025_12_17_0500
Revises: add_framework_endpoint
Create Date: 2025-12-17
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2025_12_17_0500"
down_revision = "add_framework_endpoint"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("infer_model_services", schema=None) as batch_op:
        batch_op.add_column(sa.Column("model_num_gpus", sa.Integer(), server_default=sa.text("1"), nullable=False))


def downgrade():
    with op.batch_alter_table("infer_model_services", schema=None) as batch_op:
        batch_op.drop_column("model_num_gpus")


