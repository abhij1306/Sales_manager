"""
Structured Logging for LLM Context
Provides rich, parseable logs that LLMs can use for debugging and context
"""
import logging
import json
from datetime import datetime
from typing import Any, Dict, Optional
from enum import Enum


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class StructuredLogger:
    """
    Logger that outputs JSON-formatted logs for LLM consumption
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.name = name
    
    def _log(
        self,
        level: LogLevel,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        error: Optional[Exception] = None
    ):
        """
        Log structured data in JSON format
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level.value,
            "logger": self.name,
            "message": message,
        }
        
        if context:
            log_entry["context"] = context
        
        if error:
            log_entry["error"] = {
                "type": type(error).__name__,
                "message": str(error),
                "traceback": str(error.__traceback__) if error.__traceback__ else None
            }
        
        # Log as JSON string
        self.logger.log(
            getattr(logging, level.value),
            json.dumps(log_entry)
        )
    
    def info(self, message: str, **context):
        """Log info level with context"""
        self._log(LogLevel.INFO, message, context)
    
    def warning(self, message: str, **context):
        """Log warning level with context"""
        self._log(LogLevel.WARNING, message, context)
    
    def error(self, message: str, error: Optional[Exception] = None, **context):
        """Log error level with context and exception"""
        self._log(LogLevel.ERROR, message, context, error)
    
    def debug(self, message: str, **context):
        """Log debug level with context"""
        self._log(LogLevel.DEBUG, message, context)
    
    # LLM-specific logging methods
    
    def log_api_call(
        self,
        endpoint: str,
        method: str,
        user_id: Optional[str] = None,
        payload: Optional[Dict] = None,
        response_code: Optional[int] = None
    ):
        """
        Log API call for LLM context
        """
        self.info(
            f"API Call: {method} {endpoint}",
            endpoint=endpoint,
            method=method,
            user_id=user_id,
            payload=payload,
            response_code=response_code
        )
    
    def log_business_event(
        self,
        event_type: str,
        entity_type: str,
        entity_id: str,
        details: Optional[Dict] = None
    ):
        """
        Log business events (DC created, Invoice generated, etc.)
        LLM can use this to understand system state
        """
        self.info(
            f"Business Event: {event_type}",
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
    
    def log_validation_error(
        self,
        field: str,
        value: Any,
        expected: str,
        context: Optional[Dict] = None
    ):
        """
        Log validation errors in a structured way
        LLM can explain these to users
        """
        self.warning(
            f"Validation failed for {field}",
            field=field,
            value=value,
            expected=expected,
            **(context or {})
        )


# Global logger instance
def get_structured_logger(name: str) -> StructuredLogger:
    """Get or create a structured logger"""
    return StructuredLogger(name)
