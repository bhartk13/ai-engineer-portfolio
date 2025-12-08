"""
Integration test to demonstrate chat endpoints working
This can be run manually to test the API
"""
import pytest
import requests
import json

BASE_URL = "http://localhost:8000"


@pytest.mark.skip(reason="Integration test - requires running server on localhost:8000")
def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.skip(reason="Integration test - requires running server on localhost:8000")
def test_chat_flow():
    """Test complete chat flow"""
    print("\n=== Testing Chat Flow ===")
    
    # Send first message (creates new session)
    print("\n1. Sending first message...")
    response1 = requests.post(
        f"{BASE_URL}/api/chat",
        json={"message": "Hello! What's your name?"}
    )
    print(f"Status: {response1.status_code}")
    data1 = response1.json()
    print(f"Response: {json.dumps(data1, indent=2)}")
    
    assert response1.status_code == 200
    session_id = data1["session_id"]
    print(f"Session ID: {session_id}")
    
    # Send second message (same session)
    print("\n2. Sending second message in same session...")
    response2 = requests.post(
        f"{BASE_URL}/api/chat",
        json={
            "message": "Tell me about your background",
            "session_id": session_id
        }
    )
    print(f"Status: {response2.status_code}")
    data2 = response2.json()
    print(f"Response: {json.dumps(data2, indent=2)}")
    
    assert response2.status_code == 200
    assert data2["session_id"] == session_id
    
    # Get conversation history
    print("\n3. Retrieving conversation history...")
    response3 = requests.get(f"{BASE_URL}/api/chat/history/{session_id}")
    print(f"Status: {response3.status_code}")
    data3 = response3.json()
    print(f"History: {json.dumps(data3, indent=2)}")
    
    assert response3.status_code == 200
    assert len(data3["messages"]) == 4  # 2 user messages + 2 assistant responses
    print(f"Total messages in history: {len(data3['messages'])}")


@pytest.mark.skip(reason="Integration test - requires running server on localhost:8000")
def test_empty_history():
    """Test getting history for non-existent session"""
    print("\n=== Testing Empty History ===")
    response = requests.get(f"{BASE_URL}/api/chat/history/non-existent-session")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["messages"] == []


if __name__ == "__main__":
    print("=" * 60)
    print("Digital Twin Chat API Integration Tests")
    print("=" * 60)
    print("\nNOTE: Make sure the API server is running on localhost:8000")
    print("Run: python run_local.py")
    print("=" * 60)
    
    try:
        test_health()
        test_chat_flow()
        test_empty_history()
        
        print("\n" + "=" * 60)
        print("✓ All integration tests passed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to API server")
        print("Make sure the server is running: python run_local.py")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
