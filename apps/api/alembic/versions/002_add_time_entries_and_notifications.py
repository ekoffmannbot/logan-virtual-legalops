"""Add time_entries and notifications tables.

Revision ID: 002_new_tables
Revises:
Create Date: 2026-02-23
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


revision = "002_new_tables"
down_revision = None  # Will be chained by Alembic
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Time entries
    op.create_table(
        "time_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.Column("rate_per_hour", sa.Float(), nullable=False, server_default="0"),
        sa.Column("billable", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("entry_date", sa.Date(), nullable=False, index=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("time_entries")
