import time

import pytest

from app.services.query_cache import QueryCache, is_cacheable_response, make_cache_key, normalize_question


def test_normalize_question_case_insensitive():
    assert normalize_question("  What IS Revenue? ") == normalize_question("what is revenue?")


def test_same_cache_key_for_equivalent_questions():
    assert make_cache_key("Total revenue?") == make_cache_key("  total revenue?  ")


def test_cache_hit_and_miss():
    cache = QueryCache(max_size=10, ttl_seconds=60)
    payload = {"sql": "SELECT 1", "answer": "Result: **1**", "columns": ["?column?"], "rows": [{"?column?": 1}]}

    assert cache.get("test question") is None
    cache.set("test question", payload)
    assert cache.get("test question") == payload
    assert cache.get("TEST QUESTION") == payload


def test_cache_expires():
    cache = QueryCache(max_size=10, ttl_seconds=1)
    cache.set("q", {"sql": "SELECT 1", "answer": "ok"})
    assert cache.get("q") is not None
    time.sleep(1.1)
    assert cache.get("q") is None


def test_cache_evicts_when_full():
    cache = QueryCache(max_size=2, ttl_seconds=60)
    cache.set("a", {"sql": "SELECT 1", "answer": "a"})
    time.sleep(0.01)
    cache.set("b", {"sql": "SELECT 2", "answer": "b"})
    time.sleep(0.01)
    cache.set("c", {"sql": "SELECT 3", "answer": "c"})
    assert cache.stats()["size"] == 2


def test_is_cacheable_response():
    assert is_cacheable_response({"sql": "SELECT 1", "answer": "ok"}) is True
    assert is_cacheable_response({"sql": None, "answer": "fail"}) is False
    assert is_cacheable_response({"sql": "SELECT 1", "answer": "Could not produce a valid SQL answer."}) is False
