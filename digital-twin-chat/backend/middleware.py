"""
Middleware for error handling and logging
"""
import logging
import traceback
import uuid
import time
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests and responses with correlation IDs"""
    
    async def dispatch(self, request: Request, call_next):
        # Generate correlation ID for request tracking
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        # Record start time
        start_time = time.time()
        
        # Log incoming request
        logger.info(
            f"Incoming request: {request.method} {request.url.path}",
            extra={
                "extra_fields": {
                    "correlation_id": correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "query_params": str(request.query_params),
                    "client_host": request.client.host if request.client else None,
                }
            }
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} - {response.status_code}",
            extra={
                "extra_fields": {
                    "correlation_id": correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                }
            }
        )
        
        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id
        
        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle errors and provide structured error responses"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Get correlation ID from request state
            correlation_id = getattr(request.state, 'correlation_id', str(uuid.uuid4()))
            
            # Log the error with full context
            logger.error(
                f"Unhandled exception in request: {str(exc)}",
                exc_info=True,
                extra={
                    "extra_fields": {
                        "correlation_id": correlation_id,
                        "path": request.url.path,
                        "method": request.method,
                        "error_type": type(exc).__name__,
                        "error_message": str(exc),
                    }
                }
            )
            
            # Return structured error response
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal server error",
                    "message": str(exc),
                    "correlation_id": correlation_id
                },
                headers={"X-Correlation-ID": correlation_id}
            )
