"""Build LLM failover chains and instantiate chat models per provider."""

from __future__ import annotations

import os
from dataclasses import dataclass

from config import (
    ANTHROPIC_FAILOVER_MODELS,
    DEFAULT_ANTHROPIC_MODEL,
    DEFAULT_GOOGLE_MODEL,
    DEFAULT_OPENAI_MODEL,
    GOOGLE_FAILOVER_MODELS,
)


@dataclass(frozen=True)
class ModelSpec:
    provider: str
    model: str

    def label(self) -> str:
        return f"{self.provider}:{self.model}"


def _has_provider_key(provider: str) -> bool:
    if provider == "openai":
        return bool(os.getenv("OPENAI_API_KEY"))
    if provider == "anthropic":
        return bool(os.getenv("ANTHROPIC_API_KEY"))
    if provider == "google":
        return bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))
    return False


def _parse_failover_models(raw: str) -> list[ModelSpec]:
    chain: list[ModelSpec] = []
    for entry in raw.split(","):
        item = entry.strip()
        if not item or ":" not in item:
            continue
        provider, model = item.split(":", 1)
        provider = provider.strip().lower()
        model = model.strip()
        if provider in {"openai", "anthropic", "google"} and model:
            chain.append(ModelSpec(provider, model))
    return chain


def get_failover_chain() -> list[ModelSpec]:
    """Ordered models to try; primary first, then cheaper/alternate providers."""
    custom = os.getenv("LLM_FAILOVER_MODELS", "").strip()
    if custom:
        chain = _parse_failover_models(custom)
        return [spec for spec in chain if _has_provider_key(spec.provider)]

    chain: list[ModelSpec] = []
    seen: set[tuple[str, str]] = set()

    def add(provider: str, model: str) -> None:
        if not _has_provider_key(provider):
            return
        key = (provider, model)
        if key in seen:
            return
        chain.append(ModelSpec(provider, model))
        seen.add(key)

    provider_pref = os.getenv("LLM_PROVIDER", "auto").lower()
    openai_model = os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)

    if provider_pref == "anthropic":
        _add_anthropic_models(add)
        add("openai", "gpt-4o-mini")
        _add_google_models(add)
    elif provider_pref == "openai":
        add("openai", openai_model)
        if openai_model != "gpt-4o-mini":
            add("openai", "gpt-4o-mini")
        _add_anthropic_models(add)
        _add_google_models(add)
    else:
        if os.getenv("OPENAI_API_KEY"):
            add("openai", openai_model)
            if openai_model != "gpt-4o-mini":
                add("openai", "gpt-4o-mini")
        _add_anthropic_models(add)
        _add_google_models(add)

    if not chain:
        raise ValueError(
            "Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY in .env "
            "before running the agent."
        )
    return chain


def _google_enabled_in_failover() -> bool:
    flag = os.getenv("LLM_FAILOVER_INCLUDE_GOOGLE", "true").lower()
    return flag in {"1", "true", "yes"}


def _google_models_for_chain() -> list[str]:
    if not _google_enabled_in_failover():
        return []
    primary = os.getenv("GOOGLE_MODEL", DEFAULT_GOOGLE_MODEL)
    models: list[str] = []
    seen: set[str] = set()
    for model in (primary, *GOOGLE_FAILOVER_MODELS):
        if model and model not in seen:
            models.append(model)
            seen.add(model)
    return models


def _discover_anthropic_models() -> list[str]:
    """Return Anthropic model ids from the account API (avoids hard-coded 404s)."""
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return []

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=key)
        listed = [model.id for model in client.models.list(limit=50).data]
    except Exception:
        return list(ANTHROPIC_FAILOVER_MODELS)

    if not listed:
        return list(ANTHROPIC_FAILOVER_MODELS)

    preferred: list[str] = []
    env_model = os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL)
    if env_model in listed:
        preferred.append(env_model)

    for name in listed:
        if "haiku" in name.lower() and name not in preferred:
            preferred.append(name)
    for name in listed:
        if "sonnet" in name.lower() and name not in preferred:
            preferred.append(name)

    return preferred or list(ANTHROPIC_FAILOVER_MODELS)


def _anthropic_models_for_chain() -> list[str]:
    """Models available on this Anthropic account, cheapest first."""
    discovered = _discover_anthropic_models()
    if discovered:
        return discovered

    primary = os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL)
    models: list[str] = []
    seen: set[str] = set()
    for model in (primary, *ANTHROPIC_FAILOVER_MODELS):
        if model and model not in seen:
            models.append(model)
            seen.add(model)
    return models


def _add_anthropic_models(add) -> None:
    for model in _anthropic_models_for_chain():
        add("anthropic", model)


def _add_google_models(add) -> None:
    for model in _google_models_for_chain():
        add("google", model)


def build_chat_model(spec: ModelSpec):
    """Instantiate a LangChain chat model for the given provider spec."""
    if spec.provider == "openai":
        from langchain_openai import ChatOpenAI

        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY is not set.")
        return ChatOpenAI(
            model=spec.model,
            temperature=0,
            max_retries=int(os.getenv("OPENAI_MAX_RETRIES", "2")),
        )

    if spec.provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        if not os.getenv("ANTHROPIC_API_KEY"):
            raise ValueError("ANTHROPIC_API_KEY is not set.")
        return ChatAnthropic(
            model=spec.model,
            temperature=0,
            max_retries=int(os.getenv("ANTHROPIC_MAX_RETRIES", "2")),
        )

    if spec.provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI

        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY is not set.")
        return ChatGoogleGenerativeAI(
            model=spec.model,
            google_api_key=api_key,
            temperature=0,
            max_retries=int(os.getenv("GOOGLE_MAX_RETRIES", "2")),
        )

    raise ValueError(f"Unsupported provider: {spec.provider}")
