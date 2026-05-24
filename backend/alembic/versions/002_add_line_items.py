"""add line_items to expenses

Revision ID: 002
Revises: 001
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("expenses", sa.Column("line_items", postgresql.JSONB(), nullable=True))


def downgrade():
    op.drop_column("expenses", "line_items")
