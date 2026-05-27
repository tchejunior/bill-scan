"""add status to expenses

Revision ID: 004
Revises: 003
Create Date: 2026-05-27
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('expenses', sa.Column('status', sa.String(), nullable=False, server_default='pending'))


def downgrade():
    op.drop_column('expenses', 'status')
