"""add retry credit timestamp to users

Revision ID: 006
Revises: 005
Create Date: 2026-07-05
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('retry_credit_used_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('users', 'retry_credit_used_at')
