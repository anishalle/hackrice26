"""Shared FastAPI dependencies.

Routes consume database sessions through ``get_db`` rather than creating their
own engines or transactions.
"""

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.core.db import get_db_session


def get_db() -> Generator[Session, None, None]:
    yield from get_db_session()
