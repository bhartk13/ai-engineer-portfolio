"""
Test that PDF content is properly loaded and used in LLM context
"""
import pytest
import asyncio
import os
from dotenv import load_dotenv
from persona_loader import PersonaLoader
from llm_client import LLMClient
from models import Message

# Load environment variables
load_dotenv()

@pytest.mark.skip(reason="Manual verification test - requires proper environment setup")
async def test_pdf_context():
    print("Testing PDF content in LLM context...")
    print("=" * 60)
    
    # Load persona from PDF
    loader = PersonaLoader()
    persona_content = loader.load_persona()
    
    print(f"✓ Loaded persona from PDF ({len(persona_content)} characters)")
    print()
    
    # Create LLM client
    llm_client = LLMClient()
    
    # Construct a prompt
    conversation_history = []
    user_message = "What is your professional background?"
    
    messages = llm_client.construct_prompt(
        persona=persona_content,
        conversation_history=conversation_history,
        user_message=user_message
    )
    
    print("✓ Constructed LLM prompt with persona content")
    print()
    print("System message (first 500 chars):")
    print("-" * 60)
    print(messages[0]['content'][:500])
    print("-" * 60)
    print()
    print(f"Total messages in prompt: {len(messages)}")
    print(f"  - System message: {len(messages[0]['content'])} characters")
    print(f"  - User message: {len(messages[1]['content'])} characters")
    print()
    
    # Verify persona content is in the system message
    if persona_content[:100] in messages[0]['content']:
        print("✓ Persona content is included in system message")
    else:
        print("✗ Persona content NOT found in system message")

if __name__ == "__main__":
    asyncio.run(test_pdf_context())
