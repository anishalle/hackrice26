"""Marketplace skills: the shared catalogue, plus sharing and removing your own.

Authorship follows the same demo identity bridge as voice preservation: the
frontend names the current person in a header, and that subject is the owner.
Seeded skills have no owner row, so nobody can remove them from the app.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import Skill, SkillVersion, User

CATEGORIES = ("Speech", "Voice", "Mobility", "Daily", "Care", "Automation")

SLUG_MAX = 48


class SkillNotFoundError(RuntimeError):
    pass


class NotSkillOwnerError(RuntimeError):
    pass


def list_skills(session: Session) -> list[Skill]:
    """Every published skill, best-regarded first, newest breaking ties."""
    return list(
        session.scalars(
            select(Skill)
            .where(Skill.status == "published")
            .order_by(Skill.karma.desc(), Skill.created_at.desc())
        )
    )


def get_skill(session: Session, slug: str) -> Skill | None:
    return session.scalar(
        select(Skill).where(Skill.slug == slug, Skill.status == "published")
    )


def owner_user_id(session: Session, owner_subject: str | None):
    """The user id a subject header resolves to, or None for an anonymous read."""
    if not owner_subject or not owner_subject.strip():
        return None
    return session.scalar(select(User.id).where(User.subject == owner_subject.strip()))


def create_skill(
    session: Session,
    *,
    owner_subject: str,
    title: str,
    description: str,
    tags: list[str],
    summary: str | None = None,
) -> Skill:
    """Publish a new skill under the caller's handle.

    The first version is written alongside it so the retrieval join finds the
    skill once embeddings exist; the marketplace itself reads the skill row.
    """
    subject = _validated_subject(owner_subject)
    user = session.scalar(select(User).where(User.subject == subject))
    if user is None:
        user = User(subject=subject)
        session.add(user)
        session.flush()

    clean_tags = _validated_tags(tags)
    clean_title = " ".join(title.split())
    clean_description = description.strip()
    docs: dict[str, Any] | None = None
    if summary and summary.strip():
        docs = {"summary": summary.strip(), "features": [], "why": [], "forum": []}

    skill = Skill(
        slug=_unique_slug(session, clean_title),
        author_id=user.id,
        author_handle=_handle(subject),
        title=clean_title,
        domain=None,
        goal=clean_description,
        tags=clean_tags,
        karma=0,
        featured=False,
        docs=docs,
        status="published",
    )
    session.add(skill)
    session.flush()
    session.add(
        SkillVersion(
            skill_id=skill.id,
            version=1,
            content={"description": clean_description, "docs": docs},
            retrieval_text=f"{clean_title}. {clean_description}",
            status="published",
        )
    )
    session.commit()
    session.refresh(skill)
    return skill


def delete_skill(session: Session, *, owner_subject: str, slug: str) -> None:
    """Remove a skill the caller shared. Versions and embeddings cascade."""
    subject = _validated_subject(owner_subject)
    skill = get_skill(session, slug)
    if skill is None:
        raise SkillNotFoundError("Skill not found")
    owner = owner_user_id(session, subject)
    if skill.author_id is None or owner is None or skill.author_id != owner:
        raise NotSkillOwnerError("Only the person who shared a skill can remove it")
    session.delete(skill)
    session.commit()


def slugify(title: str) -> str:
    """URL-safe, lowercase, hyphenated; never empty."""
    normalized = unicodedata.normalize("NFKD", title).encode("ascii", "ignore")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.decode().lower()).strip("-")
    return slug[:SLUG_MAX].rstrip("-") or "skill"


def _unique_slug(session: Session, title: str) -> str:
    base = slugify(title)
    taken = set(session.scalars(select(Skill.slug).where(Skill.slug.like(f"{base}%"))))
    if base not in taken:
        return base
    n = 2
    while f"{base}-{n}" in taken:
        n += 1
    return f"{base}-{n}"


def _validated_tags(tags: list[str]) -> list[str]:
    seen: list[str] = []
    for tag in tags:
        if tag not in CATEGORIES:
            raise ValueError(f"Unknown category: {tag}")
        if tag not in seen:
            seen.append(tag)
    if not seen:
        raise ValueError("Pick at least one category")
    if len(seen) > 2:
        raise ValueError("Pick at most two categories")
    return seen


def _validated_subject(owner_subject: str) -> str:
    subject = owner_subject.strip()
    if not subject or len(subject) > 255:
        raise ValueError("A valid owner subject header is required")
    return subject


def _handle(subject: str) -> str:
    """The public byline. Subjects are already handles in the demo app."""
    handle = subject if subject.startswith("@") else f"@{subject}"
    return handle[:64]
