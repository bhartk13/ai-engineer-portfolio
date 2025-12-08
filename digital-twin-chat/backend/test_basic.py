"""
Basic tests to verify core components are working
"""
import os
import tempfile
import pytest
from datetime import datetime
from models import Message, Conversation, ChatRequest, ChatResponse, HealthResponse
from persona_loader import PersonaLoader
from memory_manager import MemoryManager


def test_models_creation():
    """Test that all models can be instantiated"""
    # Test Message
    msg = Message(
        role="user",
        content="Hello",
        session_id="test-session"
    )
    assert msg.role == "user"
    assert msg.content == "Hello"
    
    # Test Conversation
    conv = Conversation(
        session_id="test-session",
        messages=[msg]
    )
    assert conv.session_id == "test-session"
    assert len(conv.messages) == 1
    
    # Test ChatRequest
    req = ChatRequest(message="Hello", session_id="test-session")
    assert req.message == "Hello"
    assert req.stream is False
    
    # Test ChatResponse
    resp = ChatResponse(response="Hi there", session_id="test-session")
    assert resp.response == "Hi there"
    
    # Test HealthResponse
    health = HealthResponse(status="healthy", version="0.1.0")
    assert health.status == "healthy"


def test_persona_loader_local():
    """Test PersonaLoader with local filesystem"""
    # Create a temporary persona file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
        f.write("This is a test persona.")
        temp_path = f.name
    
    try:
        # Set environment for local mode
        os.environ["ENVIRONMENT"] = "local"
        os.environ["LOCAL_PERSONA_PATH"] = temp_path
        
        loader = PersonaLoader()
        persona = loader.load_persona()
        
        assert persona == "This is a test persona."
        
        # Test caching
        persona2 = loader.load_persona()
        assert persona2 == persona
        
    finally:
        os.unlink(temp_path)


def test_memory_manager_local():
    """Test MemoryManager with local filesystem"""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Set environment for local mode
        os.environ["ENVIRONMENT"] = "local"
        os.environ["LOCAL_STORAGE_PATH"] = temp_dir
        
        manager = MemoryManager()
        
        # Create and store a message
        msg = Message(
            role="user",
            content="Test message",
            session_id="test-session-123"
        )
        manager.store(msg)
        
        # Retrieve conversation
        conv = manager.retrieve("test-session-123")
        assert conv is not None
        assert len(conv.messages) == 1
        assert conv.messages[0].content == "Test message"
        
        # Store another message
        msg2 = Message(
            role="assistant",
            content="Test response",
            session_id="test-session-123"
        )
        manager.store(msg2)
        
        # Retrieve updated conversation
        conv2 = manager.retrieve("test-session-123")
        assert len(conv2.messages) == 2
        assert conv2.messages[1].content == "Test response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
