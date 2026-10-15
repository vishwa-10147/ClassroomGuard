"""Bring the database schema up to date before the API starts.

Databases created before migrations worked (by the app's create_all) already have the
tables but no alembic_version row; those are stamped at the baseline first so that
`upgrade head` does not try to create existing tables.

Usage (from the repo root, or /app in the container):
    python -m backend.scripts.migrate
"""

import asyncio
from pathlib import Path

from backend.app.core.config import settings
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from alembic.config import Config

BASELINE = "e4d73b38f52f"
ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


async def _existing_tables() -> set[str]:
    engine = create_async_engine(settings.database_url)
    try:
        async with engine.connect() as conn:
            return set(await conn.run_sync(lambda c: inspect(c).get_table_names()))
    finally:
        await engine.dispose()


def main() -> None:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    tables = asyncio.run(_existing_tables())
    if "users" in tables and "alembic_version" not in tables:
        print(f"Existing schema without migration history - stamping baseline {BASELINE}")
        command.stamp(cfg, BASELINE)
    command.upgrade(cfg, "head")
    print("Database schema is up to date")


if __name__ == "__main__":
    main()
