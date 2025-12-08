"""
Secrets Manager Client - Retrieves secrets from AWS Secrets Manager
"""
import logging
import os
import time
from typing import Optional, Dict
import boto3
from botocore.exceptions import ClientError
from retry_utils import retry_with_backoff, RetryConfig

logger = logging.getLogger(__name__)


class SecretsManagerClient:
    """Client for retrieving secrets from AWS Secrets Manager with caching"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "local")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.secret_name = os.getenv("SECRETS_MANAGER_SECRET_NAME", "")
        
        # Cache configuration
        self.cache_ttl = int(os.getenv("SECRETS_CACHE_TTL", "3600"))  # 1 hour default
        self._cache: Dict[str, tuple[str, float]] = {}  # key -> (value, timestamp)
        
        # Initialize AWS Secrets Manager client for non-local environments
        if self.environment != "local":
            if not self.secret_name:
                logger.warning("SECRETS_MANAGER_SECRET_NAME not configured")
            self.client = boto3.client('secretsmanager', region_name=self.aws_region)
        else:
            self.client = None
        
        logger.info(f"SecretsManagerClient initialized for environment: {self.environment}")
    
    def get_secret(self, key: str) -> str:
        """
        Retrieve a secret value
        
        Args:
            key: Secret key to retrieve
            
        Returns:
            Secret value as string
            
        Raises:
            ValueError: If secret not found or environment is local without fallback
        """
        # Check cache first
        cached_value = self._get_from_cache(key)
        if cached_value is not None:
            logger.debug(f"Returning cached secret for key: {key}")
            return cached_value
        
        # For local environment, fallback to environment variables
        if self.environment == "local":
            value = self._get_from_env(key)
            if value:
                self._add_to_cache(key, value)
                return value
            else:
                raise ValueError(f"Secret '{key}' not found in environment variables for local development")
        
        # For non-local environments, retrieve from Secrets Manager
        try:
            value = self._get_from_secrets_manager(key)
            self._add_to_cache(key, value)
            return value
        except Exception as e:
            logger.error(f"Error retrieving secret '{key}': {e}")
            raise
    
    def _get_from_cache(self, key: str) -> Optional[str]:
        """Get secret from cache if not expired"""
        if key not in self._cache:
            return None
        
        value, timestamp = self._cache[key]
        current_time = time.time()
        
        # Check if cache entry has expired
        if current_time - timestamp > self.cache_ttl:
            logger.debug(f"Cache expired for key: {key}")
            del self._cache[key]
            return None
        
        return value
    
    def _add_to_cache(self, key: str, value: str) -> None:
        """Add secret to cache with current timestamp"""
        self._cache[key] = (value, time.time())
        logger.debug(f"Added secret to cache: {key}")
    
    def _get_from_env(self, key: str) -> Optional[str]:
        """Get secret from environment variables (local development only)"""
        # Convert key to uppercase environment variable format
        env_key = key.upper()
        value = os.getenv(env_key)
        
        if value:
            logger.info(f"Retrieved secret from environment variable: {env_key}")
        else:
            logger.warning(f"Secret not found in environment variables: {env_key}")
        
        return value
    
    @retry_with_backoff(config=RetryConfig(max_attempts=3, initial_delay=1.0))
    def _get_from_secrets_manager(self, key: str) -> str:
        """Get secret from AWS Secrets Manager with retry logic"""
        if not self.client:
            raise RuntimeError("Secrets Manager client not initialized")
        
        try:
            # Retrieve the secret
            response = self.client.get_secret_value(SecretId=self.secret_name)
            
            # Parse the secret string (assuming JSON format)
            import json
            secret_dict = json.loads(response['SecretString'])
            
            if key not in secret_dict:
                logger.error(f"Key '{key}' not found in secret '{self.secret_name}'")
                raise ValueError(f"Key '{key}' not found in secret '{self.secret_name}'")
            
            logger.info(f"Retrieved secret from Secrets Manager: {key}")
            return secret_dict[key]
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == 'ResourceNotFoundException':
                logger.error(f"Secret '{self.secret_name}' not found in Secrets Manager", exc_info=True)
                raise ValueError(f"Secret '{self.secret_name}' not found in Secrets Manager")
            elif error_code == 'InvalidRequestException':
                logger.error(f"Invalid request to Secrets Manager: {e}", exc_info=True)
                raise ValueError(f"Invalid request to Secrets Manager: {e}")
            elif error_code == 'InvalidParameterException':
                logger.error(f"Invalid parameter in Secrets Manager request: {e}", exc_info=True)
                raise ValueError(f"Invalid parameter in Secrets Manager request: {e}")
            elif error_code == 'DecryptionFailure':
                logger.error(f"Failed to decrypt secret: {e}", exc_info=True)
                raise RuntimeError(f"Failed to decrypt secret: {e}")
            elif error_code == 'InternalServiceError':
                logger.error(f"Secrets Manager internal error: {e}", exc_info=True)
                raise RuntimeError(f"Secrets Manager internal error: {e}")
            else:
                logger.error(f"Secrets Manager error (code: {error_code}): {e}", exc_info=True)
                raise RuntimeError(f"Secrets Manager error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error retrieving secret from Secrets Manager: {e}", exc_info=True)
            raise
    
    def clear_cache(self, key: Optional[str] = None) -> None:
        """
        Clear cached secrets
        
        Args:
            key: Specific key to clear, or None to clear all
        """
        if key:
            if key in self._cache:
                del self._cache[key]
                logger.info(f"Cleared cache for key: {key}")
        else:
            self._cache.clear()
            logger.info("Cleared all cached secrets")
    
    def refresh_secret(self, key: str) -> str:
        """
        Force refresh a secret from source
        
        Args:
            key: Secret key to refresh
            
        Returns:
            Refreshed secret value
        """
        self.clear_cache(key)
        return self.get_secret(key)
