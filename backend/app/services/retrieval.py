"""pgvector retrieval for published marketplace skill chunks."""

from collections.abc import Sequence

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.db_models import Skill, SkillEmbedding, SkillVersion


def build_skill_retrieval_query(
    embedding: Sequence[float], *, domain: str | None = None, limit: int = 5
) -> Select[tuple[SkillEmbedding, SkillVersion, Skill]]:
    """Build a cosine-distance query for compatible, published skill chunks.

    The embedding provider is intentionally outside this service. Callers pass
    an already-generated vector, which keeps model credentials out of database
    code and makes the query straightforward to test.
    """
    statement = (
        select(SkillEmbedding, SkillVersion, Skill)
        .join(SkillVersion, SkillEmbedding.skill_version_id == SkillVersion.id)
        .join(Skill, SkillVersion.skill_id == Skill.id)
        .where(Skill.status == "published", SkillVersion.status == "published")
        .order_by(SkillEmbedding.embedding.cosine_distance(list(embedding)))
        .limit(limit)
    )
    if domain:
        statement = statement.where(Skill.domain == domain)
    return statement


def retrieve_skill_chunks(
    session: Session,
    embedding: Sequence[float],
    *,
    domain: str | None = None,
    limit: int = 5,
) -> list[tuple[SkillEmbedding, SkillVersion, Skill]]:
    """Return the closest published skill chunks by cosine distance."""
    return list(
        session.execute(
            build_skill_retrieval_query(embedding, domain=domain, limit=limit)
        ).tuples()
    )
