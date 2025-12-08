"""
Pydantic models for Digital Twin Chat API
"""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


def utc_now():
    """Get current UTC time"""
    return datetime.now(timezone.utc)


class Message(BaseModel):
    """Individual message in a conversation"""
    role: str = Field(..., description="Role of the message sender: 'user' or 'assistant'")
    content: str = Field(..., description="Content of the message")
    timestamp: datetime = Field(default_factory=utc_now, description="Message timestamp")
    session_id: str = Field(..., description="Session ID this message belongs to")


class Conversation(BaseModel):
    """Complete conversation with all messages"""
    session_id: str = Field(..., description="Unique session identifier")
    messages: List[Message] = Field(default_factory=list, description="List of messages in chronological order")
    created_at: datetime = Field(default_factory=utc_now, description="Conversation creation timestamp")
    updated_at: datetime = Field(default_factory=utc_now, description="Last update timestamp")


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="User message content", min_length=1)
    session_id: Optional[str] = Field(None, description="Optional session ID for conversation continuity")
    stream: bool = Field(False, description="Whether to stream the response")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description="Assistant response content")
    session_id: str = Field(..., description="Session ID for this conversation")
    timestamp: datetime = Field(default_factory=utc_now, description="Response timestamp")


class HealthResponse(BaseModel):
    """Response model for health check endpoint"""
    status: str = Field(..., description="Health status")
    version: str = Field(..., description="API version")
