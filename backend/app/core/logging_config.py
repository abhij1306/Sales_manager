"""
Structured Logging Configuration
Provides JSON-formatted logs with context for production observability
"""
import logging
import sys
from datetime import datetime
from typing import Any, Dict
import json
from pathlib import Path

class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields (from extra={} in log calls)
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = round(record.duration_ms, 2)
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "path"):
            log_data["path"] = record.path
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "client_ip"):
            log_data["client_ip"] = record.client_ip
            
        return json.dumps(log_data)


class HumanReadableFormatter(logging.Formatter):
    """Human-readable formatter for development"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Color codes
        colors = {
            'DEBUG': '\033[36m',    # Cyan
            'INFO': '\033[32m',     # Green
            'WARNING': '\033[33m',  # Yellow
            'ERROR': '\033[31m',    # Red
            'CRITICAL': '\033[35m', # Magenta
        }
        reset = '\033[0m'
        
        level_color = colors.get(record.levelname, '')
        timestamp = datetime.fromtimestamp(record.created).strftime('%H:%M:%S')
        
        # Build message
        msg = f"{level_color}[{timestamp}] {record.levelname:8s}{reset} {record.name:30s} {record.getMessage()}"
        
        # Add extra context if available
        extras = []
        if hasattr(record, "request_id"):
            extras.append(f"req_id={record.request_id[:8]}")
        if hasattr(record, "duration_ms"):
            extras.append(f"duration={record.duration_ms:.0f}ms")
        if hasattr(record, "status_code"):
            extras.append(f"status={record.status_code}")
            
        if extras:
            msg += f" [{', '.join(extras)}]"
        
        # Add exception if present
        if record.exc_info:
            msg += "\n" + self.formatException(record.exc_info)
            
        return msg


def setup_logging(log_level: str = "INFO", use_json: bool = False):
    """
    Configure structured logging for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        use_json: If True, use JSON formatter; otherwise use human-readable
    """
    
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Choose formatter
    if use_json:
        formatter = StructuredFormatter()
    else:
        formatter = HumanReadableFormatter()
    
    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    
    # File handler - always use JSON for file logs
    file_handler = logging.FileHandler(logs_dir / "app.log")
    file_handler.setFormatter(StructuredFormatter())
    file_handler.setLevel(log_level)
    
    # Error file handler - only errors
    error_handler = logging.FileHandler(logs_dir / "error.log")
    error_handler.setFormatter(StructuredFormatter())
    error_handler.setLevel(logging.ERROR)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Add handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)
    
    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    
    # Log startup
    logger = logging.getLogger(__name__)
    logger.info(
        f"Logging configured: level={log_level}, json={use_json}",
        extra={"log_level": log_level, "json_format": use_json}
    )


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name"""
    return logging.getLogger(name)
