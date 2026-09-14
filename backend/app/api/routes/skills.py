"""Marketplace endpoints: browse the catalogue, share a skill, remove your own."""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import CreateSkillRequest, SkillResponse
from app.services.marketplace import (
    NotSkillOwnerError,
    SkillNotFoundError,
    create_skill,
    delete_skill,
    get_skill,
    list_skills,
    owner_user_id,
)

router = APIRouter(prefix="/skills", tags=["skills"])

# Reading is anonymous. The header is optional here only so the response can
# say which skills are the caller's own; writes require it.
OwnerHeader = Header(default=None, alias="X-Owner-Subject")


@router.get("", response_model=list[SkillResponse])
def skills(
    owner_subject: str | None = OwnerHeader,
    session: Session = Depends(get_db),
) -> list[SkillResponse]:
    owner = owner_user_id(session, owner_subject)
    return [_response(s, owner) for s in list_skills(session)]


@router.get("/{slug}", response_model=SkillResponse)
def skill(
    slug: str,
    owner_subject: str | None = OwnerHeader,
    session: Session = Depends(get_db),
) -> SkillResponse:
    found = get_skill(session, slug)
    if found is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    return _response(found, owner_user_id(session, owner_subject))


@router.post("", response_model=SkillResponse, status_code=201)
def share_skill(
    request: CreateSkillRequest,
    owner_subject: str = Header(alias="X-Owner-Subject"),
    session: Session = Depends(get_db),
) -> SkillResponse:
    try:
        created = create_skill(
            session,
            owner_subject=owner_subject,
            title=request.title,
            description=request.description,
            tags=list(request.tags),
            summary=request.summary,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return _response(created, created.author_id)


@router.delete("/{slug}", status_code=204)
def remove_skill(
    slug: str,
    owner_subject: str = Header(alias="X-Owner-Subject"),
    session: Session = Depends(get_db),
) -> None:
    try:
        delete_skill(session, owner_subject=owner_subject, slug=slug)
    except SkillNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except NotSkillOwnerError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


def _response(skill, owner) -> SkillResponse:
    return SkillResponse(
        id=skill.id,
        slug=skill.slug,
        title=skill.title,
        author=skill.author_handle,
        tags=skill.tags,
        karma=skill.karma,
        featured=skill.featured,
        description=skill.goal,
        docs=skill.docs,
        mine=owner is not None and skill.author_id == owner,
        created_at=skill.created_at,
    )
