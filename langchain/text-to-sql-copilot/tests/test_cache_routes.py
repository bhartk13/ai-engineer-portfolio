import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app
from app.services.cache_factory import get_query_cache


@pytest.fixture(autouse=True)
def reset_cache():
    get_query_cache().clear()
    get_settings.cache_clear()
    yield
    get_query_cache().clear()


@pytest.mark.asyncio
async def test_query_cache_hit(monkeypatch):
    call_count = 0

    async def fake_run_agent(question, session):
        nonlocal call_count
        call_count += 1
        return {
            "sql": "SELECT COUNT(*) FROM customers LIMIT 100",
            "answer": "Result: **5**",
            "columns": ["count"],
            "rows": [{"count": 5}],
            "relevant_tables": ["customers"],
            "llm_calls": 1,
            "retry_count": 0,
        }

    monkeypatch.setattr("app.api.routes.run_agent", fake_run_agent)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.post("/api/v1/query", json={"question": "How many customers?"})
        r2 = await client.post("/api/v1/query", json={"question": "how many customers?"})

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["cached"] is False
    assert r2.json()["cached"] is True
    assert call_count == 1


@pytest.mark.asyncio
async def test_cache_bypass_header(monkeypatch):
    call_count = 0

    async def fake_run_agent(question, session):
        nonlocal call_count
        call_count += 1
        return {
            "sql": "SELECT 1",
            "answer": "ok",
            "columns": [],
            "rows": [],
            "relevant_tables": [],
            "llm_calls": 1,
            "retry_count": 0,
        }

    monkeypatch.setattr("app.api.routes.run_agent", fake_run_agent)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/api/v1/query", json={"question": "test bypass"})
        await client.post(
            "/api/v1/query",
            json={"question": "test bypass"},
            headers={"X-Cache-Bypass": "true"},
        )

    assert call_count == 2
