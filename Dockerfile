FROM python:3.12-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:0.12.10 /uv /usr/local/bin/uv

WORKDIR /code
ENV PATH="/code/.venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 UV_NO_CACHE=1
COPY pyproject.toml uv.lock ./
COPY backend/README.md ./backend/README.md
COPY backend/app ./backend/app
RUN uv sync --frozen --no-dev --no-editable && useradd --uid 10001 --create-home aide
COPY alembic.ini ./
COPY alembic ./alembic
USER aide

EXPOSE 8000
# One worker: browser sessions and approval futures currently live in memory.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
