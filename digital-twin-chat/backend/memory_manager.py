"""
Memory Manager - Manages conversation history storage and retrieval
"""
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from models import Conversation, Message
from retry_utils import retry_with_backoff, RetryConfig


def utc_now():
    """Get current UTC time"""
    return datetime.now(timezone.utc)

logger = logging.getLogger(__name__)


class MemoryManager:
    """Manages conversation memory using local JSON files or S3"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "local")
        
        # Configuration for local environment
        self.local_storage_path = os.getenv("LOCAL_STORAGE_PATH", "./local_storage")
        
        # Configuration for AWS environment
        self.s3_bucket = os.getenv("S3_MEMORY_BUCKET", "")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if self.environment == "local":
            # Ensure local storage directory exists
            Path(self.local_storage_path).mkdir(parents=True, exist_ok=True)
            self.s3_client = None
        else:
            if self.s3_bucket:
                self.s3_client = boto3.client('s3', region_name=self.aws_region)
            else:
                self.s3_client = None
                logger.warning("S3_MEMORY_BUCKET not configured for non-local environment")
        
        logger.info(f"MemoryManager initialized for environment: {self.environment}")
    
    def store(self, message: Message) -> None:
        """
        Store a message in the conversation history
        
        Args:
            message: Message object to store
        """
        try:
            # Retrieve existing conversation or create new one
            conversation = self.retrieve(message.session_id)
            
            if conversation is None:
                conversation = Conversation(
                    session_id=message.session_id,
                    messages=[],
                    created_at=utc_now(),
                    updated_at=utc_now()
                )
            
            # Add message to conversation
            conversation.messages.append(message)
            conversation.updated_at = utc_now()
            
            # Save conversation
            if self.environment == "local":
                self._save_to_filesystem(conversation)
            else:
                self._save_to_s3(conversation)
            
            logger.info(f"Message stored for session {message.session_id}")
            
        except Exception as e:
            logger.error(f"Error storing message for session {message.session_id}: {e}", exc_info=True)
            raise
    
    def retrieve(self, session_id: str) -> Optional[Conversation]:
        """
        Retrieve conversation history for a session
        
        Args:
            session_id: Session identifier
            
        Returns:
            Conversation object or None if not found
        """
        try:
            if self.environment == "local":
                return self._load_from_filesystem(session_id)
            else:
                return self._load_from_s3(session_id)
                
        except Exception as e:
            logger.error(f"Error retrieving conversation for session {session_id}: {e}", exc_info=True)
            # Return None instead of raising to allow new conversations
            return None
    
    def _save_to_filesystem(self, conversation: Conversation) -> None:
        """Save conversation to local JSON file"""
        try:
            file_path = os.path.join(self.local_storage_path, f"{conversation.session_id}.json")
            
            # Convert to dict for JSON serialization
            conversation_dict = conversation.model_dump(mode='json')
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(conversation_dict, f, indent=2, default=str)
            
            logger.debug(f"Conversation saved to {file_path}")
            
        except IOError as e:
            logger.error(f"IO error saving conversation to filesystem: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error saving conversation to filesystem: {e}", exc_info=True)
            raise
    
    def _load_from_filesystem(self, session_id: str) -> Optional[Conversation]:
        """Load conversation from local JSON file"""
        try:
            file_path = os.path.join(self.local_storage_path, f"{session_id}.json")
            
            if not os.path.exists(file_path):
                logger.debug(f"No conversation found for session {session_id}")
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                conversation_dict = json.load(f)
            
            # Convert back to Conversation object
            conversation = Conversation(**conversation_dict)
            logger.debug(f"Conversation loaded from {file_path}")
            return conversation
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in conversation file for session {session_id}: {e}", exc_info=True)
            return None
        except IOError as e:
            logger.error(f"IO error loading conversation from filesystem: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Unexpected error loading conversation from filesystem: {e}", exc_info=True)
            return None
    
    @retry_with_backoff(config=RetryConfig(max_attempts=3, initial_delay=1.0))
    def _save_to_s3(self, conversation: Conversation) -> None:
        """Save conversation to S3 with retry logic"""
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")
        
        s3_key = f"conversations/{conversation.session_id}.json"
        
        try:
            # Convert to dict for JSON serialization
            conversation_dict = conversation.model_dump(mode='json')
            conversation_json = json.dumps(conversation_dict, indent=2, default=str)
            
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=s3_key,
                Body=conversation_json.encode('utf-8'),
                ContentType='application/json'
            )
            logger.debug(f"Conversation saved to s3://{self.s3_bucket}/{s3_key}")
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(
                f"S3 ClientError saving conversation (code: {error_code}): {e}",
                exc_info=True
            )
            raise
        except Exception as e:
            logger.error(f"Unexpected error saving to S3: {e}", exc_info=True)
            raise
    
    @retry_with_backoff(config=RetryConfig(max_attempts=3, initial_delay=1.0))
    def _load_from_s3(self, session_id: str) -> Optional[Conversation]:
        """Load conversation from S3 with retry logic"""
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")
        
        s3_key = f"conversations/{session_id}.json"
        
        try:
            response = self.s3_client.get_object(Bucket=self.s3_bucket, Key=s3_key)
            conversation_json = response['Body'].read().decode('utf-8')
            conversation_dict = json.loads(conversation_json)
            
            # Convert back to Conversation object
            conversation = Conversation(**conversation_dict)
            logger.debug(f"Conversation loaded from s3://{self.s3_bucket}/{s3_key}")
            return conversation
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.debug(f"No conversation found for session {session_id}")
                return None
            else:
                logger.error(
                    f"S3 ClientError loading conversation (code: {error_code}): {e}",
                    exc_info=True
                )
                raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in S3 conversation file for session {session_id}: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Unexpected error loading from S3: {e}", exc_info=True)
            raise
