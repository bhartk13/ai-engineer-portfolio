from functools import lru_cache

from app.config import get_settings
from app.services.query_cache import QueryCache


@lru_cache
def get_query_cache() -> QueryCache:
    settings = get_settings()
    return QueryCache(max_size=settings.cache_max_size, ttl_seconds=settings.cache_ttl_seconds)
