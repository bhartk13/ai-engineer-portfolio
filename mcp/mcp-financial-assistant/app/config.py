import os

# STORAGE_MODE: 'sqlite' (default) or 'memory'
STORAGE_MODE = os.getenv("STORAGE_MODE", "sqlite").lower()
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "data/mcp_fin_accounts.db")

# OpenAI / LLM configuration (left empty for POC; use fallback parser)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Plaid configuration
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID", "")
PLAID_SECRET = os.getenv("PLAID_SECRET", "")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")  # sandbox, development, or production
# OAuth redirect URI - must be configured in Plaid Dashboard
# Set to empty string "" to disable OAuth redirect (for testing without OAuth)
PLAID_REDIRECT_URI = os.getenv("PLAID_REDIRECT_URI", "http://localhost:8501/oauth/callback")
