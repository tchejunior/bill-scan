"""add display_name to users

Revision ID: 003
Revises: 002
Create Date: 2026-05-27
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('display_name', sa.String(), nullable=True))
    op.execute("UPDATE users SET display_name = split_part(email, '@', 1) WHERE display_name IS NULL")


def downgrade():
    op.drop_column('users', 'display_name')
