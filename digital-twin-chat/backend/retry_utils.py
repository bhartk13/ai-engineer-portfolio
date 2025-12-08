"""
Retry utilities with exponential backoff for transient failures
"""
import logging
import time
import random
from typing import Callable, TypeVar, Optional, Type
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter


def calculate_backoff_delay(
    attempt: int,
    config: RetryConfig
) -> float:
    """
    Calculate exponential backoff delay with optional jitter
    
    Args:
        attempt: Current attempt number (0-indexed)
        config: Retry configuration
        
    Returns:
        Delay in seconds
    """
    # Calculate exponential delay
    delay = min(
        config.initial_delay * (config.exponential_base ** attempt),
        config.max_delay
    )
    
    # Add jitter to prevent thundering herd
    if config.jitter:
        delay = delay * (0.5 + random.random() * 0.5)
    
    return delay


def is_transient_error(exception: Exception) -> bool:
    """
    Determine if an error is transient and should be retried
    
    Args:
        exception: The exception to check
        
    Returns:
        True if the error is transient
    """
    # Import here to avoid circular dependencies
    try:
        from botocore.exceptions import ClientError
    except ImportError:
        ClientError = type(None)
    
    # Network-related errors
    transient_error_types = (
        ConnectionError,
        TimeoutError,
        OSError,
    )
    
    if isinstance(exception, transient_error_types):
        return True
    
    # AWS-specific transient errors
    if ClientError is not type(None) and isinstance(exception, ClientError):
        error_code = exception.response.get('Error', {}).get('Code', '')
        transient_codes = [
            'ThrottlingException',
            'TooManyRequestsException',
            'ServiceUnavailable',
            'InternalServerError',
            'RequestTimeout',
            'RequestTimeoutException',
            'PriorRequestNotComplete',
            'ProvisionedThroughputExceededException',
            'SlowDown',
        ]
        return error_code in transient_codes
    
    # Check error message for common transient patterns
    error_message = str(exception).lower()
    transient_patterns = [
        'timeout',
        'timed out',
        'connection',
        'temporarily unavailable',
        'service unavailable',
        'too many requests',
        'rate limit',
    ]
    
    return any(pattern in error_message for pattern in transient_patterns)


def retry_with_backoff(
    config: Optional[RetryConfig] = None,
    retryable_exceptions: Optional[tuple[Type[Exception], ...]] = None
):
    """
    Decorator to retry a function with exponential backoff
    
    Args:
        config: Retry configuration (uses defaults if None)
        retryable_exceptions: Tuple of exception types to retry (retries all if None)
        
    Returns:
        Decorated function
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(config.max_attempts):
                try:
                    return func(*args, **kwargs)
                    
                except Exception as e:
                    last_exception = e
                    
                    # Check if we should retry this exception
                    should_retry = (
                        retryable_exceptions is None or
                        isinstance(e, retryable_exceptions) or
                        is_transient_error(e)
                    )
                    
                    if not should_retry:
                        logger.warning(f"Non-retryable error in {func.__name__}: {e}")
                        raise
                    
                    # Don't sleep after the last attempt
                    if attempt < config.max_attempts - 1:
                        delay = calculate_backoff_delay(attempt, config)
                        logger.warning(
                            f"Attempt {attempt + 1}/{config.max_attempts} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay:.2f}s..."
                        )
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"All {config.max_attempts} attempts failed for {func.__name__}: {e}"
                        )
            
            # All attempts exhausted
            raise last_exception
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            import asyncio
            last_exception = None
            
            for attempt in range(config.max_attempts):
                try:
                    return await func(*args, **kwargs)
                    
                except Exception as e:
                    last_exception = e
                    
                    # Check if we should retry this exception
                    should_retry = (
                        retryable_exceptions is None or
                        isinstance(e, retryable_exceptions) or
                        is_transient_error(e)
                    )
                    
                    if not should_retry:
                        logger.warning(f"Non-retryable error in {func.__name__}: {e}")
                        raise
                    
                    # Don't sleep after the last attempt
                    if attempt < config.max_attempts - 1:
                        delay = calculate_backoff_delay(attempt, config)
                        logger.warning(
                            f"Attempt {attempt + 1}/{config.max_attempts} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay:.2f}s..."
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"All {config.max_attempts} attempts failed for {func.__name__}: {e}"
                        )
            
            # All attempts exhausted
            raise last_exception
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
