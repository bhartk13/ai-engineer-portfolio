"""
Pytest configuration and fixtures
"""
import pytest
from unittest.mock import Mock, MagicMock
import sys
import os

# Set environment variables before any imports
os.environ["ENVIRONMENT"] = "local"
os.environ["LLM_PROVIDER"] = "openai"
os.environ["OPENAI_API_KEY"] = "test-key"


# Mock openai module before it gets imported
mock_openai = MagicMock()
mock_openai.OpenAI = MagicMock()
sys.modules['openai'] = mock_openai
