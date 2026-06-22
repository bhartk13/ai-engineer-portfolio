import hashlib
import re
import time
from dataclasses import dataclass
from threading import Lock
from typing import Any

from app.logging_config import get_logger

logger = get_logger(__name__)


def normalize_question(question: str) -> str:
    """Canonical form for cache keys — case/whitespace insensitive."""
    collapsed = re.sub(r"\s+", " ", question.strip().lower())
    return collapsed


def make_cache_key(question: str) -> str:
    normalized = normalize_question(question)
    return hashlib.sha256(normalized.encode()).hexdigest()


@dataclass
class CacheEntry:
    value: dict[str, Any]
    expires_at: float


class QueryCache:
    """Thread-safe in-memory TTL cache for successful query responses."""

    def __init__(self, max_size: int = 256, ttl_seconds: int = 300) -> None:
        self._max_size = max_size
        self._ttl_seconds = ttl_seconds
        self._store: dict[str, CacheEntry] = {}
        self._lock = Lock()

    def get(self, question: str) -> dict[str, Any] | None:
        key = make_cache_key(question)
        now = time.monotonic()

        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry.expires_at <= now:
                del self._store[key]
                return None
            return entry.value

    def set(self, question: str, response: dict[str, Any]) -> None:
        key = make_cache_key(question)
        expires_at = time.monotonic() + self._ttl_seconds

        with self._lock:
            if len(self._store) >= self._max_size and key not in self._store:
                self._evict_oldest()
            self._store[key] = CacheEntry(value=response, expires_at=expires_at)

    def clear(self) -> int:
        with self._lock:
            count = len(self._store)
            self._store.clear()
            return count

    def stats(self) -> dict[str, int]:
        with self._lock:
            return {"size": len(self._store), "max_size": self._max_size, "ttl_seconds": self._ttl_seconds}

    def _evict_oldest(self) -> None:
        if not self._store:
            return
        oldest_key = min(self._store, key=lambda k: self._store[k].expires_at)
        del self._store[oldest_key]


def is_cacheable_response(response: dict[str, Any]) -> bool:
    """Only cache successful answers that ran valid SQL."""
    if not response.get("sql"):
        return False
    answer = response.get("answer", "")
    if answer.startswith("Could not produce a valid SQL answer"):
        return False
    return True
