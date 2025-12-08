"""
Structured logging configuration with JSON formatter and correlation IDs
"""
import logging
import json
import sys
import os
from datetime import datetime
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON
        
        Args:
            record: Log record to format
            
        Returns:
            JSON-formatted log string
        """
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add correlation ID if present
        if hasattr(record, 'correlation_id'):
            log_data["correlation_id"] = record.correlation_id
        
        # Add extra fields from record
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info) if record.exc_info else None
            }
        
        # Add stack trace if present
        if record.stack_info:
            log_data["stack_info"] = record.stack_info
        
        return json.dumps(log_data)


class CorrelationIDFilter(logging.Filter):
    """Filter to add correlation ID to log records"""
    
    def __init__(self):
        super().__init__()
        self.correlation_id = None
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Add correlation ID to record if available
        
        Args:
            record: Log record to filter
            
        Returns:
            True to allow record to be logged
        """
        if not hasattr(record, 'correlation_id') and self.correlation_id:
            record.correlation_id = self.correlation_id
        return True
    
    def set_correlation_id(self, correlation_id: str):
        """Set the correlation ID for this filter"""
        self.correlation_id = correlation_id


def configure_logging():
    """
    Configure structured logging for the application
    
    Sets up JSON formatting for production and human-readable format for local development
    """
    environment = os.getenv("ENVIRONMENT", "local")
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # Use JSON formatter for non-local environments
    if environment != "local":
        formatter = JSONFormatter()
    else:
        # Use human-readable format for local development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Add correlation ID filter
    correlation_filter = CorrelationIDFilter()
    root_logger.addFilter(correlation_filter)
    
    # Log configuration
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured for environment: {environment}, level: {log_level}")
    
    return correlation_filter


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)
