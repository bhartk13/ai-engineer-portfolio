#!/usr/bin/env python3
"""Initialize database schema, seed data, and read-only copilot user."""

import asyncio
import os
import sys

import sqlparse
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
load_dotenv(os.path.join(ROOT, ".env"))

from app.db.schema import SCHEMA_DDL, SEED_SQL


def split_sql(sql: str) -> list[str]:
    """Split a SQL script into individual statements for asyncpg."""
    cleaned = sqlparse.format(sql, strip_comments=True).strip()
    return [stmt.strip() for stmt in sqlparse.split(cleaned) if stmt.strip()]


async def run_script(conn, sql: str) -> None:
    for statement in split_sql(sql):
        await conn.execute(text(statement))


async def setup_copilot_role(conn, db_name: str, password: str) -> None:
    await conn.execute(
        text(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE usename = 'copilot' AND pid <> pg_backend_pid()
            """
        )
    )
    await conn.execute(
        text(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'copilot') THEN
                    CREATE ROLE copilot WITH LOGIN PASSWORD '{password}';
                ELSE
                    ALTER ROLE copilot WITH LOGIN PASSWORD '{password}';
                END IF;
            END
            $$;
            """
        )
    )
    await conn.execute(text(f"GRANT CONNECT ON DATABASE {db_name} TO copilot"))
    await conn.execute(text("GRANT USAGE ON SCHEMA public TO copilot"))
    await conn.execute(text("GRANT SELECT ON ALL TABLES IN SCHEMA public TO copilot"))
    await conn.execute(
        text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO copilot")
    )


async def main() -> None:
    admin_url = os.getenv(
        "DATABASE_ADMIN_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5433/sales_db",
    )
    copilot_password = os.getenv("COPILOT_DB_PASSWORD", "changeme")
    db_name = make_url(admin_url).database or "sales_db"

    engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")

    async with engine.connect() as conn:
        print("Creating tables...")
        await run_script(conn, SCHEMA_DDL)

        print("Resetting seed data...")
        await conn.execute(
            text("TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE")
        )

        print("Inserting seed data...")
        await run_script(conn, SEED_SQL)

        print("Creating read-only copilot user...")
        await setup_copilot_role(conn, db_name, copilot_password)

    await engine.dispose()
    print("Database initialized: schema, seed data, and read-only 'copilot' user created.")


if __name__ == "__main__":
    asyncio.run(main())
