"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

# Reusable enum column types — create_type=False because we manage creation
# via raw SQL below so the _on_table_create event never fires.
_receipt_status = postgresql.ENUM(
    "pending", "processing", "processed", "failed",
    name="receiptstatus", create_type=False,
)
_payment_method = postgresql.ENUM(
    "cash", "credit", "debit", "pix", "boleto", "other",
    name="paymentmethod", create_type=False,
)


def upgrade():
    conn = op.get_bind()

    # PL/pgSQL exception blocks are idempotent — safe to re-run
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE receiptstatus AS ENUM ('pending', 'processing', 'processed', 'failed');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
    """))
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE paymentmethod AS ENUM ('cash', 'credit', 'debit', 'pix', 'boleto', 'other');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
    """))

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("otp_enabled", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("image_path", sa.String(), nullable=False),
        sa.Column("status", _receipt_status, nullable=False, server_default="pending"),
        sa.Column("uploaded_at", sa.DateTime(timezone=True)),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_ai_output", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_receipts_user_id", "receipts", ["user_id"])

    op.create_table(
        "expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("receipt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("receipts.id"), nullable=True),
        sa.Column("vendor", sa.String(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="BRL"),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("payment_method", _payment_method, nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_manual", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_expenses_user_id", "expenses", ["user_id"])
    op.create_index("ix_expenses_date", "expenses", ["date"])


def downgrade():
    op.drop_index("ix_expenses_date", "expenses")
    op.drop_index("ix_expenses_user_id", "expenses")
    op.drop_index("ix_receipts_user_id", "receipts")
    op.drop_table("expenses")
    op.drop_table("receipts")
    op.drop_table("users")
    op.get_bind().execute(sa.text("DROP TYPE IF EXISTS paymentmethod"))
    op.get_bind().execute(sa.text("DROP TYPE IF EXISTS receiptstatus"))
