"""Relational data model for profiles, marketplace skills, and agent runs.

These models deliberately keep user-created skills as structured relational
data. pgvector is used only to retrieve relevant skill chunks, never as the
canonical copy of a skill.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pgvector.sqlalchemy import VECTOR
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings


class Base(DeclarativeBase):
    """Base metadata consumed by Alembic migrations."""


class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class User(CreatedAtMixin, Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("subject"),)

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    subject: Mapped[str] = mapped_column(String(255), index=True)


class AccessibilityProfile(CreatedAtMixin, Base):
    __tablename__ = "accessibility_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    input_methods: Mapped[list[str]] = mapped_column(JSONB, default=list)
    output_methods: Mapped[list[str]] = mapped_column(JSONB, default=list)
    preferences: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class VoiceProfile(CreatedAtMixin, Base):
    """Consent-backed archive and provider state for a user's preserved voice."""

    __tablename__ = "voice_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
    )
    display_name: Mapped[str] = mapped_column(String(255))
    consent_granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consent_version: Mapped[str] = mapped_column(String(64))
    provider_voice_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    provider_status: Mapped[str] = mapped_column(
        String(32), default="collecting", index=True
    )
    cloned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class VoiceSample(CreatedAtMixin, Base):
    """Original user-owned recording stored as PostgreSQL bytea data."""

    __tablename__ = "voice_samples"
    __table_args__ = (
        UniqueConstraint(
            "voice_profile_id", "sha256", name="uq_voice_samples_profile_sha256"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    voice_profile_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("voice_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(128))
    byte_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    phrase_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_data: Mapped[bytes] = mapped_column(LargeBinary)


class Skill(CreatedAtMixin, Base):
    """One marketplace entry: what the app lists, searches and opens.

    ``goal`` is the one-line card description. ``docs`` is the optional
    long-form page (summary, features, why, forum) that only some skills have.
    ``slug`` is the stable public handle the apps navigate by; ``id`` stays the
    relational key.
    """

    __tablename__ = "skills"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    author_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    author_handle: Mapped[str] = mapped_column(String(64), default="")
    title: Mapped[str] = mapped_column(String(255))
    # Site the skill is tied to, when there is one. Cross-site skills leave it
    # empty, which is why retrieval treats the filter as optional.
    domain: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    goal: Mapped[str] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    karma: Mapped[int] = mapped_column(Integer, default=0)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    docs: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)


class SkillVersion(CreatedAtMixin, Base):
    __tablename__ = "skill_versions"
    __table_args__ = (
        UniqueConstraint("skill_id", "version", name="uq_skill_versions_skill_version"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    skill_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB)
    retrieval_text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)


class SkillEmbedding(CreatedAtMixin, Base):
    __tablename__ = "skill_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "skill_version_id", "chunk_index", name="uq_skill_embeddings_version_chunk"
        ),
        Index(
            "ix_skill_embeddings_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    skill_version_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("skill_versions.id", ondelete="CASCADE"),
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    embedding: Mapped[list[float]] = mapped_column(
        VECTOR(settings.EMBEDDING_DIMENSIONS)
    )


class AgentRun(CreatedAtMixin, Base):
    __tablename__ = "agent_runs"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    goal: Mapped[str] = mapped_column(Text)
    mode: Mapped[str] = mapped_column(String(32), default="guide", index=True)
    profile_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    selected_skill_ids: Mapped[list[str]] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)


class AgentSession(CreatedAtMixin, Base):
    __tablename__ = "agent_sessions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    run_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        unique=True,
    )
    hermes_session_id: Mapped[str] = mapped_column(String(255), unique=True)
    current_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ApprovalRequest(CreatedAtMixin, Base):
    __tablename__ = "approval_requests"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    run_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        index=True,
    )
    action_type: Mapped[str] = mapped_column(String(64))
    action_payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    page_url: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
