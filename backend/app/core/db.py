"""PostgreSQL and pgvector connection management.

Schema changes belong in Alembic migrations. This module only creates pooled
sessions and verifies that the pgvector extension is available at application
startup when DATABASE_URL is configured.
"""

from collections.abc import Generator

from pgvector.psycopg import register_vector
from psycopg import ProgrammingError
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings, sqlalchemy_database_url

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """Return the singleton PostgreSQL engine, creating it on first use."""
    global _engine
    if _engine is None:
        if settings.DATABASE_URL is None:
            raise RuntimeError("DATABASE_URL is required for database-backed routes")
        _engine = create_engine(
            sqlalchemy_database_url(), echo=settings.DATABASE_ECHO, pool_pre_ping=True
        )

        @event.listens_for(_engine, "connect")
        def register_pgvector(
            dbapi_connection: object, _connection_record: object
        ) -> None:
            # Initial Alembic setup creates the extension after the connection
            # opens. Until then there is no PostgreSQL vector type to register.
            try:
                register_vector(dbapi_connection)
            except ProgrammingError:
                pass

    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the singleton request-session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(), autoflush=False, expire_on_commit=False
        )
    return _session_factory


def get_db_session() -> Generator[Session, None, None]:
    """FastAPI dependency that scopes a SQLAlchemy session to one request."""
    with get_session_factory()() as session:
        yield session


def verify_database() -> None:
    """Fail fast when the configured database has not been migrated yet."""
    with get_engine().begin() as connection:
        vector_available = connection.execute(
            text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')")
        ).scalar_one()
        if not vector_available:
            raise RuntimeError(
                "pgvector is not enabled. Run `uv run alembic upgrade head` "
                "before starting the API."
            )
        register_vector(connection.connection.driver_connection)


def dispose_database() -> None:
    """Release pooled connections during application shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None
