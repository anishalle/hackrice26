"""Record each voice sample's duration so short takes can be kept but not cloned.

Revision ID: 20260913_0005
Revises: 20260913_0004
Create Date: 2026-09-13 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260913_0005"
down_revision: str | Sequence[str] | None = "20260913_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable: existing rows are backfilled by the application where the
    # recording can still be decrypted, and unknown durations stay usable.
    op.add_column(
        "voice_samples",
        sa.Column("duration_seconds", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("voice_samples", "duration_seconds")
