"""
LLM Client - Handles interactions with LLM services (OpenAI or AWS Bedrock)
"""
import logging
import os
from typing import List, Optional, AsyncIterator
import json
from models import Message
from retry_utils import retry_with_backoff, RetryConfig

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for interacting with LLM services"""
    
    def __init__(self, secrets_manager=None):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        self.model = os.getenv("LLM_MODEL", "gpt-4")
        self.max_tokens = int(os.getenv("LLM_MAX_TOKENS", "2000"))
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.7"))
        self.secrets_manager = secrets_manager
        
        # Initialize provider-specific clients
        if self.provider == "openai":
            self._init_openai()
        elif self.provider == "bedrock":
            self._init_bedrock()
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
        
        logger.info(f"LLMClient initialized with provider: {self.provider}, model: {self.model}")
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        try:
            import openai
            
            # Get API key from secrets manager or environment
            if self.secrets_manager:
                try:
                    api_key = self.secrets_manager.get_secret("openai_api_key")
                except Exception as e:
                    logger.error(f"Failed to retrieve OpenAI API key from Secrets Manager: {e}", exc_info=True)
                    raise
            else:
                api_key = os.getenv("OPENAI_API_KEY")
            
            if not api_key:
                logger.error("OpenAI API key not found in Secrets Manager or environment")
                raise ValueError("OpenAI API key not found")
            
            self.client = openai.OpenAI(api_key=api_key)
            
        except ImportError as e:
            logger.error("openai package not installed", exc_info=True)
            raise ImportError("openai package not installed. Install with: pip install openai")
        except Exception as e:
            logger.error(f"Error initializing OpenAI client: {e}", exc_info=True)
            raise
    
    def _init_bedrock(self):
        """Initialize AWS Bedrock client"""
        try:
            import boto3
            
            aws_region = os.getenv("AWS_REGION", "us-east-1")
            self.bedrock_client = boto3.client('bedrock-runtime', region_name=aws_region)
            
        except ImportError as e:
            logger.error("boto3 package not installed", exc_info=True)
            raise ImportError("boto3 package not installed. Install with: pip install boto3")
        except Exception as e:
            logger.error(f"Error initializing Bedrock client: {e}", exc_info=True)
            raise
    
    def construct_prompt(
        self,
        persona: str,
        conversation_history: List[Message],
        user_message: str
    ) -> List[dict]:
        """
        Construct LLM prompt with persona and conversation history
        
        Args:
            persona: Persona content to inject
            conversation_history: Previous messages in the conversation
            user_message: Current user message
            
        Returns:
            List of message dictionaries for LLM API
        """
        messages = []
        
        # Add system message with persona
        system_content = f"You are a digital twin with the following persona:\n\n{persona}\n\nRespond as this person would, maintaining their communication style, knowledge, and personality."
        messages.append({"role": "system", "content": system_content})
        
        # Add conversation history
        for msg in conversation_history:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        # Log token estimation
        estimated_tokens = self._estimate_tokens(messages)
        logger.info(f"Constructed prompt with ~{estimated_tokens} tokens")
        
        return messages
    
    def _estimate_tokens(self, messages: List[dict]) -> int:
        """Rough estimation of token count"""
        total_chars = sum(len(msg["content"]) for msg in messages)
        # Rough estimate: 1 token ≈ 4 characters
        return total_chars // 4
    
    async def generate_response(
        self,
        persona: str,
        conversation_history: List[Message],
        user_message: str,
        stream: bool = False
    ) -> str:
        """
        Generate response from LLM
        
        Args:
            persona: Persona content
            conversation_history: Previous messages
            user_message: Current user message
            stream: Whether to stream the response
            
        Returns:
            Generated response text
        """
        try:
            messages = self.construct_prompt(persona, conversation_history, user_message)
            
            if self.provider == "openai":
                return await self._generate_openai(messages, stream)
            elif self.provider == "bedrock":
                return await self._generate_bedrock(messages, stream)
            else:
                logger.error(f"Unsupported LLM provider: {self.provider}")
                raise ValueError(f"Unsupported provider: {self.provider}")
                
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}", exc_info=True)
            raise
    
    @retry_with_backoff(config=RetryConfig(max_attempts=3, initial_delay=2.0, max_delay=30.0))
    async def _generate_openai(self, messages: List[dict], stream: bool) -> str:
        """Generate response using OpenAI with retry logic"""
        import asyncio
        from functools import partial
        
        try:
            if stream:
                # For now, implement non-streaming and return full response
                # Streaming support can be added later
                logger.warning("Streaming not yet implemented, using non-streaming")
            
            # Run the synchronous OpenAI call in an executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                partial(
                    self.client.chat.completions.create,
                    model=self.model,
                    messages=messages,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature
                )
            )
            
            content = response.choices[0].message.content
            logger.info(f"Generated response ({len(content)} characters)")
            return content
            
        except Exception as e:
            # Check for specific OpenAI errors
            error_message = str(e).lower()
            if 'rate limit' in error_message or 'quota' in error_message:
                logger.error(f"OpenAI rate limit or quota error: {e}", exc_info=True)
            elif 'timeout' in error_message:
                logger.error(f"OpenAI timeout error: {e}", exc_info=True)
            elif 'authentication' in error_message or 'api key' in error_message:
                logger.error(f"OpenAI authentication error: {e}", exc_info=True)
            else:
                logger.error(f"OpenAI API error: {e}", exc_info=True)
            raise
    
    @retry_with_backoff(config=RetryConfig(max_attempts=3, initial_delay=2.0, max_delay=30.0))
    async def _generate_bedrock(self, messages: List[dict], stream: bool) -> str:
        """Generate response using AWS Bedrock with retry logic"""
        try:
            # Convert messages to Claude format
            system_message = next((m["content"] for m in messages if m["role"] == "system"), "")
            conversation_messages = [m for m in messages if m["role"] != "system"]
            
            # Prepare request body for Claude
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "messages": conversation_messages
            }
            
            if system_message:
                request_body["system"] = system_message
            
            response = self.bedrock_client.invoke_model(
                modelId=self.model,
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            content = response_body['content'][0]['text']
            
            logger.info(f"Generated response ({len(content)} characters)")
            return content
            
        except Exception as e:
            # Check for specific Bedrock errors
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError):
                error_code = e.response.get('Error', {}).get('Code', '')
                logger.error(f"Bedrock ClientError (code: {error_code}): {e}", exc_info=True)
            else:
                logger.error(f"Bedrock API error: {e}", exc_info=True)
            raise
