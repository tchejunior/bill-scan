"""add partial to receiptstatus enum

Revision ID: 004
Revises: 003
Create Date: 2026-05-27
"""
from alembic import op

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE receiptstatus ADD VALUE IF NOT EXISTS 'partial'")


def downgrade():
    # PostgreSQL does not support removing enum values; this is intentionally a no-op.
    pass
