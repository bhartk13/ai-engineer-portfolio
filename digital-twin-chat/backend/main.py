"""
Digital Twin Chat Backend - FastAPI Application
"""
import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import HealthResponse, ChatRequest, ChatResponse, Message
from middleware import ErrorHandlingMiddleware, RequestLoggingMiddleware
from persona_loader import PersonaLoader
from memory_manager import MemoryManager
from llm_client import LLMClient
from secrets_manager import SecretsManagerClient
from logging_config import configure_logging, get_logger

# Configure structured logging
configure_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="Digital Twin Chat API",
    description="Backend API for Digital Twin Chat Application",
    version="0.1.0"
)

# Add middleware (order matters - last added is executed first)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
environment = os.getenv("ENVIRONMENT", "local")
secrets_manager = SecretsManagerClient() if environment != "local" else None
persona_loader = PersonaLoader()
memory_manager = MemoryManager()
llm_client = LLMClient(secrets_manager=secrets_manager)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    logger.info("Health check requested")
    return HealthResponse(status="healthy", version="0.1.0")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint - processes user messages and returns Digital Twin responses
    
    Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3
    """
    session_id = None
    try:
        # Generate session_id if not provided
        session_id = request.session_id or str(uuid.uuid4())
        logger.info(f"Processing chat request for session: {session_id}")
        
        # Load persona content with comprehensive error handling
        try:
            persona_content = persona_loader.load_persona()
        except FileNotFoundError as e:
            logger.error(f"Persona file not found: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Persona configuration error: persona file not found"
            )
        except Exception as e:
            logger.error(f"Error loading persona: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Failed to load persona configuration"
            )
        
        # Retrieve conversation history with error handling
        try:
            conversation = memory_manager.retrieve(session_id)
            conversation_history = conversation.messages if conversation else []
            logger.info(f"Retrieved {len(conversation_history)} previous messages")
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}", exc_info=True)
            # Continue with empty history rather than failing
            conversation_history = []
            logger.warning("Continuing with empty conversation history due to retrieval error")
        
        # Generate LLM response with comprehensive error handling
        try:
            assistant_response = await llm_client.generate_response(
                persona=persona_content,
                conversation_history=conversation_history,
                user_message=request.message,
                stream=request.stream
            )
        except ValueError as e:
            logger.error(f"Invalid LLM configuration: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="LLM configuration error"
            )
        except ConnectionError as e:
            logger.error(f"LLM connection error: {e}", exc_info=True)
            raise HTTPException(
                status_code=503,
                detail="LLM service temporarily unavailable"
            )
        except TimeoutError as e:
            logger.error(f"LLM timeout error: {e}", exc_info=True)
            raise HTTPException(
                status_code=504,
                detail="LLM service timeout"
            )
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}", exc_info=True)
            raise HTTPException(
                status_code=503,
                detail="LLM service unavailable"
            )
        
        # Store user message with error handling
        try:
            user_message = Message(
                role="user",
                content=request.message,
                session_id=session_id
            )
            memory_manager.store(user_message)
        except Exception as e:
            logger.error(f"Error storing user message: {e}", exc_info=True)
            # Continue even if storage fails - don't block response
            logger.warning("Continuing despite user message storage failure")
        
        # Store assistant response with error handling
        try:
            assistant_message = Message(
                role="assistant",
                content=assistant_response,
                session_id=session_id
            )
            memory_manager.store(assistant_message)
        except Exception as e:
            logger.error(f"Error storing assistant message: {e}", exc_info=True)
            # Continue even if storage fails - don't block response
            logger.warning("Continuing despite assistant message storage failure")
        
        logger.info(f"Chat response generated for session: {session_id}")
        
        # Return response
        return ChatResponse(
            response=assistant_response,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error in chat endpoint for session {session_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """
    Get conversation history for a session
    
    Requirements: 2.2
    """
    try:
        logger.info(f"Retrieving chat history for session: {session_id}")
        
        # Retrieve conversation
        conversation = memory_manager.retrieve(session_id)
        
        if conversation is None:
            logger.info(f"No conversation found for session: {session_id}")
            return {"messages": []}
        
        # Convert messages to dict format
        messages = [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in conversation.messages
        ]
        
        logger.info(f"Retrieved {len(messages)} messages for session: {session_id}")
        return {"messages": messages}
        
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")


# Lambda handler using Mangum
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    # Mangum not installed - running locally
    handler = None

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
