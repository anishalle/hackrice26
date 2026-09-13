"""Turn the skills table into the marketplace and seed the launch catalogue.

Revision ID: 20260913_0003
Revises: 20260913_0002
Create Date: 2026-09-13 12:00:00
"""

from collections.abc import Sequence
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260913_0003"
down_revision: str | Sequence[str] | None = "20260913_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# The catalogue the apps shipped with, frozen here so this migration keeps
# producing the same rows however the application code changes later. Ids are
# derived from the slug so re-running against a database that already has them
# is a no-op rather than a duplicate.
SEED_SKILLS: list[dict] = [
    {
        "slug": "voice-bank",
        "title": "Voice Bank Builder",
        "author_handle": "@sunay",
        "tags": ["Voice", "Speech"],
        "karma": 214,
        "featured": True,
        "goal": (
            "Runs your recording sittings, checks each take, and builds a speech "
            "voice that still sounds like you."
        ),
        "docs": {
            "summary": (
                "Voice banking records your natural speech while you still have "
                "it, so a speech device can use your own voice later instead of a "
                "synthetic one. The hard part is not the recording. It is knowing "
                "what to say, how much is enough, and when to start. Axl runs all "
                "three for you, and uses the audio already sitting in your weekly "
                "check-ins."
            ),
            "features": [
                {
                    "title": "A script that sounds like you",
                    "body": (
                        "Starts from the phrases you actually use day to day, "
                        "pulled from your own messages and check-ins, not a "
                        "generic word list."
                    ),
                },
                {
                    "title": "Short sittings, tracked",
                    "body": (
                        "Twenty minute blocks with a running count of what is "
                        "banked and what is left. Stops you whenever your voice "
                        "tires."
                    ),
                },
                {
                    "title": "Quality checks as you go",
                    "body": (
                        "Flags takes with room noise, clipping, or a tired voice "
                        "before they end up in your final bank."
                    ),
                },
                {
                    "title": "Hands off by design",
                    "body": (
                        "Runs on voice commands, a single switch, or gaze, so it "
                        "keeps working as grip and reach change."
                    ),
                },
            ],
            "why": [
                (
                    "Starting early matters more than recording a lot. Most people "
                    "get a usable bank from a few hundred phrases caught before "
                    "speech changes."
                ),
                (
                    "Every weekly check-in you have already done is usable audio, "
                    "so the bank starts ahead of where you think it does."
                ),
                (
                    "A banked voice carries your rhythm and emphasis, which is "
                    "what people who know you actually recognise."
                ),
                (
                    "Everything stays on your device until you choose a voice "
                    "provider, so you are not locked to one before you have picked."
                ),
            ],
            "forum": [
                {
                    "id": "q1",
                    "asker": "jordan",
                    "question": (
                        "My speech has already slurred a bit. Is it too late to start?"
                    ),
                    "answer": (
                        "No. Banking still works with mild slurring, and the "
                        "checker will tell you which takes are clean enough to "
                        "keep. Start with your most-used phrases first in case "
                        "you get fewer sittings than you hoped."
                    ),
                },
                {
                    "id": "q2",
                    "asker": "priya",
                    "question": "How many phrases before it is actually usable?",
                    "answer": (
                        "Around 400 gets you a bank that sounds like you in "
                        "everyday conversation. 1500 or so is what providers ask "
                        "for a full synthetic voice. Both are useful, so do not "
                        "wait until you can commit to the bigger number."
                    ),
                },
                {
                    "id": "q3",
                    "asker": "jules",
                    "question": "Does the room matter much?",
                    "answer": (
                        "More than the microphone does. A carpeted room with the "
                        "door shut beats an expensive mic in a kitchen. Keep the "
                        "same room across sittings if you can."
                    ),
                },
            ],
        },
    },
    {
        "slug": "refill-runner",
        "title": "Refill Runner",
        "author_handle": "@sahas",
        "tags": ["Care", "Automation"],
        "karma": 186,
        "featured": True,
        "goal": (
            "Tracks every prescription, sits in the pharmacy queue for you, and "
            "only asks when something needs a decision."
        ),
    },
    {
        "slug": "appeal-writer",
        "title": "Insurance Appeal Writer",
        "author_handle": "@priya",
        "tags": ["Care", "Automation"],
        "karma": 171,
        "featured": True,
        "goal": (
            "Drafts the appeal from your denial letter and your own notes, in "
            "your words, ready for you to send."
        ),
    },
    {
        "slug": "eye-gaze-tune",
        "title": "Eye-Gaze Tune-Up",
        "author_handle": "@jordan",
        "tags": ["Mobility", "Automation"],
        "karma": 168,
        "goal": (
            "Recalibrates gaze targets as your control changes, and grows the hit "
            "areas before you start missing them."
        ),
    },
    {
        "slug": "ride-booker",
        "title": "Ride Booker",
        "author_handle": "@sahas",
        "tags": ["Mobility", "Daily"],
        "karma": 141,
        "goal": (
            "Books accessible transport, confirms the lift actually works, and "
            "re-books itself when a driver cancels."
        ),
    },
    {
        "slug": "grocery-loop",
        "title": "Grocery Loop",
        "author_handle": "@priya",
        "tags": ["Daily", "Automation"],
        "karma": 122,
        "goal": (
            "Reorders your usual shop on your own rhythm and swaps in packaging "
            "you can still open one-handed."
        ),
    },
    {
        "slug": "form-filler",
        "title": "Form Filler",
        "author_handle": "@jules",
        "tags": ["Daily", "Automation"],
        "karma": 118,
        "goal": (
            "Fills disability, grant and clinic forms from what Axl already "
            "knows, then reads the answers back before sending."
        ),
    },
    {
        "slug": "care-roster",
        "title": "Care Shift Roster",
        "author_handle": "@sahas",
        "tags": ["Care"],
        "karma": 97,
        "goal": (
            "Builds the overnight turning and suctioning rota and asks the next "
            "person itself, so nobody has to chase."
        ),
    },
    {
        "slug": "inbox-triage",
        "title": "Inbox Triage",
        "author_handle": "@amina",
        "tags": ["Automation", "Daily"],
        "karma": 88,
        "goal": (
            "Answers what it safely can in your voice, holds the rest, and reads "
            "you the short list once a day."
        ),
    },
    {
        "slug": "switch-recipes",
        "title": "Switch Control Recipes",
        "author_handle": "@jordan",
        "tags": ["Automation", "Mobility"],
        "karma": 76,
        "goal": (
            "One-switch scanning setups for phone, lights and bed, retuned by Axl "
            "as movement narrows."
        ),
    },
    {
        "slug": "clinic-brief",
        "title": "Clinic Prep Brief",
        "author_handle": "@sunay",
        "tags": ["Care", "Speech"],
        "karma": 64,
        "goal": (
            "Turns your check-ins into the two pages your clinic team reads "
            "before a visit, so nothing is recalled from memory."
        ),
    },
    {
        "slug": "read-aloud",
        "title": "Read-Aloud Replies",
        "author_handle": "@jules",
        "tags": ["Speech", "Voice"],
        "karma": 52,
        "goal": (
            "Speaks your typed replies in your banked voice, with the phrases you "
            "use most kept one tap away."
        ),
    },
    {
        "slug": "fatigue-pacer",
        "title": "Fatigue Pacer",
        "author_handle": "@amina",
        "tags": ["Daily", "Automation"],
        "karma": 41,
        "goal": (
            "Budgets the day into energy blocks and holds notifications until you "
            "have room for them."
        ),
    },
]


def seed_skill_id(slug: str):
    return uuid5(NAMESPACE_URL, f"axl-skill:{slug}")


def seed_version_id(slug: str):
    return uuid5(NAMESPACE_URL, f"axl-skill-version:{slug}:1")


def upgrade() -> None:
    op.add_column("skills", sa.Column("slug", sa.String(length=64), nullable=True))
    op.add_column(
        "skills",
        sa.Column(
            "author_handle",
            sa.String(length=64),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "skills",
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "skills",
        sa.Column("karma", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "skills",
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "skills",
        sa.Column("docs", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    # A skill can span sites, so the destination is no longer required.
    op.alter_column("skills", "domain", existing_type=sa.String(255), nullable=True)

    # Any pre-existing rows get their id as a slug so the NOT NULL can land.
    op.execute("UPDATE skills SET slug = id::text WHERE slug IS NULL")
    op.alter_column("skills", "slug", existing_type=sa.String(64), nullable=False)
    op.create_index("ix_skills_slug", "skills", ["slug"], unique=True)

    skills = sa.table(
        "skills",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("slug", sa.String),
        sa.column("author_handle", sa.String),
        sa.column("title", sa.String),
        sa.column("domain", sa.String),
        sa.column("goal", sa.Text),
        sa.column("tags", postgresql.JSONB),
        sa.column("karma", sa.Integer),
        sa.column("featured", sa.Boolean),
        sa.column("docs", postgresql.JSONB),
        sa.column("status", sa.String),
    )
    versions = sa.table(
        "skill_versions",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("skill_id", postgresql.UUID(as_uuid=True)),
        sa.column("version", sa.Integer),
        sa.column("content", postgresql.JSONB),
        sa.column("retrieval_text", sa.Text),
        sa.column("status", sa.String),
    )
    skill_rows = [
        {
            "id": seed_skill_id(s["slug"]),
            "slug": s["slug"],
            "author_handle": s["author_handle"],
            "title": s["title"],
            "domain": None,
            "goal": s["goal"],
            "tags": s["tags"],
            "karma": s["karma"],
            "featured": s.get("featured", False),
            "docs": s.get("docs"),
            "status": "published",
        }
        for s in SEED_SKILLS
    ]
    version_rows = [
        {
            "id": seed_version_id(s["slug"]),
            "skill_id": seed_skill_id(s["slug"]),
            "version": 1,
            "content": {"description": s["goal"], "docs": s.get("docs")},
            "retrieval_text": f"{s['title']}. {s['goal']}",
            "status": "published",
        }
        for s in SEED_SKILLS
    ]
    op.execute(
        postgresql.insert(skills)
        .values(skill_rows)
        .on_conflict_do_nothing(index_elements=["slug"])
    )
    op.execute(
        postgresql.insert(versions)
        .values(version_rows)
        .on_conflict_do_nothing(constraint="uq_skill_versions_skill_version")
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM skills WHERE slug = ANY(:slugs)"),
        {"slugs": [s["slug"] for s in SEED_SKILLS]},
    )

    op.drop_index("ix_skills_slug", table_name="skills")
    op.alter_column("skills", "domain", existing_type=sa.String(255), nullable=False)
    op.drop_column("skills", "docs")
    op.drop_column("skills", "featured")
    op.drop_column("skills", "karma")
    op.drop_column("skills", "tags")
    op.drop_column("skills", "author_handle")
    op.drop_column("skills", "slug")
