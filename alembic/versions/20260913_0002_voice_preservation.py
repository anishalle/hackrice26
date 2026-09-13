"""Add consent-backed PostgreSQL voice preservation.

Revision ID: 20260913_0002
Revises: 20260912_0001
Create Date: 2026-09-13 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260913_0002"
down_revision: str | Sequence[str] | None = "20260912_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "voice_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("consent_granted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consent_version", sa.String(length=64), nullable=False),
        sa.Column("provider_voice_id", sa.String(length=255), nullable=True),
        sa.Column("provider_status", sa.String(length=32), nullable=False),
        sa.Column(
            "cloned_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("provider_voice_id"),
    )
    op.create_index(
        "ix_voice_profiles_provider_status", "voice_profiles", ["provider_status"]
    )

    op.create_table(
        "voice_samples",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("voice_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("phrase_hint", sa.Text(), nullable=True),
        sa.Column("audio_data", sa.LargeBinary(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["voice_profile_id"], ["voice_profiles.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "voice_profile_id", "sha256", name="uq_voice_samples_profile_sha256"
        ),
    )
    op.create_index(
        "ix_voice_samples_voice_profile_id", "voice_samples", ["voice_profile_id"]
    )


def downgrade() -> None:
    op.drop_table("voice_samples")
    op.drop_table("voice_profiles")
