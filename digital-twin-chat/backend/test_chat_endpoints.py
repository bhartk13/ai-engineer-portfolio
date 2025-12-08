"""
Tests for chat endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock

from main import app

client = TestClient(app)


@pytest.fixture
def mock_llm_response():
    """Mock LLM response"""
    return "This is a test response from the digital twin."


@pytest.fixture
def mock_persona():
    """Mock persona content"""
    return "Test persona content"


def test_chat_endpoint_creates_new_session(mock_llm_response, mock_persona):
    """Test that chat endpoint creates a new session when session_id is not provided"""
    with patch('main.llm_client.generate_response', new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = mock_llm_response
        
        with patch('main.persona_loader.load_persona') as mock_load_persona:
            mock_load_persona.return_value = mock_persona
            
            response = client.post(
                "/api/chat",
                json={"message": "Hello, digital twin!"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            assert "session_id" in data
            assert data["response"] == mock_llm_response
            assert len(data["session_id"]) > 0  # UUID should be generated


def test_chat_endpoint_uses_provided_session(mock_llm_response, mock_persona):
    """Test that chat endpoint uses provided session_id"""
    test_session_id = "test-session-123"
    
    with patch('main.llm_client.generate_response', new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = mock_llm_response
        
        with patch('main.persona_loader.load_persona') as mock_load_persona:
            mock_load_persona.return_value = mock_persona
            
            response = client.post(
                "/api/chat",
                json={
                    "message": "Hello!",
                    "session_id": test_session_id
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == test_session_id


def test_chat_endpoint_handles_missing_persona():
    """Test that chat endpoint handles missing persona file gracefully"""
    with patch('main.persona_loader.load_persona') as mock_load_persona:
        mock_load_persona.side_effect = FileNotFoundError("Persona file not found")
        
        response = client.post(
            "/api/chat",
            json={"message": "Hello!"}
        )
        
        assert response.status_code == 500
        assert "Persona configuration error" in response.json()["detail"]


def test_chat_endpoint_validates_empty_message():
    """Test that chat endpoint rejects empty messages"""
    response = client.post(
        "/api/chat",
        json={"message": ""}
    )
    
    assert response.status_code == 422  # Validation error


def test_get_history_endpoint_returns_empty_for_new_session():
    """Test that history endpoint returns empty list for non-existent session"""
    response = client.get("/api/chat/history/non-existent-session")
    
    assert response.status_code == 200
    data = response.json()
    assert "messages" in data
    assert data["messages"] == []


def test_get_history_endpoint_returns_messages():
    """Test that history endpoint returns stored messages"""
    import uuid
    # Use unique session ID to avoid conflicts with previous test runs
    test_session_id = f"test-history-{uuid.uuid4()}"
    
    with patch('main.llm_client.generate_response', new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = "Test response"
        
        with patch('main.persona_loader.load_persona') as mock_load_persona:
            mock_load_persona.return_value = "Test persona"
            
            # Send a chat message
            client.post(
                "/api/chat",
                json={
                    "message": "Test message",
                    "session_id": test_session_id
                }
            )
            
            # Retrieve history
            response = client.get(f"/api/chat/history/{test_session_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert "messages" in data
            assert len(data["messages"]) == 2  # User message + assistant response
            assert data["messages"][0]["role"] == "user"
            assert data["messages"][0]["content"] == "Test message"
            assert data["messages"][1]["role"] == "assistant"
            assert data["messages"][1]["content"] == "Test response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
