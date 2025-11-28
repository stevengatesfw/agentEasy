"""
数据库迁移: 添加 framework 和 endpoint 字段到 models_hub 表

==========================================
迁移信息
==========================================

迁移描述:
---------
- 在 models_hub 表中添加 framework 和 endpoint 字段
- framework: 模型框架，如 LMDeploy, SenseVoiceDeploy
- endpoint: 推理端点，如 /v1/chat/interactive, /generate

重要说明:
---------
⚠️  在生产环境执行前，请务必：
   1. 在测试环境中完整验证所有迁移操作
   2. 备份生产数据库
   3. 确认迁移操作的可逆性
   4. 评估大表操作的性能影响
   5. 准备回滚计划

📋 使用方法:
   - 升级到此版本: flask db upgrade
   - 降级到上一版本: flask db downgrade
   - 查看当前版本: flask db current
   - 查看迁移历史: flask db history

🔍 如有疑问，请联系数据库管理员或开发团队。
"""

from alembic import op
import sqlalchemy as sa

# =============================================================================
# 迁移版本标识符
# =============================================================================

revision = 'add_framework_endpoint'
down_revision = 'def28d16b22a'  # 基于 init migrate 版本
branch_labels = None
depends_on = None


# =============================================================================
# 数据库升级操作
# =============================================================================

def upgrade():
    """
    执行数据库升级操作。
    
    在 models_hub 表中添加 framework 和 endpoint 字段。
    """
    # 添加 framework 字段
    op.add_column('models_hub', 
                  sa.Column('framework', sa.String(length=255), nullable=True))
    
    # 添加 endpoint 字段
    op.add_column('models_hub', 
                  sa.Column('endpoint', sa.String(length=255), nullable=True))


# =============================================================================
# 数据库降级操作
# =============================================================================

def downgrade():
    """
    执行数据库降级操作。
    
    从 models_hub 表中删除 framework 和 endpoint 字段。
    """
    # 删除 endpoint 字段
    op.drop_column('models_hub', 'endpoint')
    
    # 删除 framework 字段
    op.drop_column('models_hub', 'framework')



