"""
Core package initialization
"""
from app.core.result import (
    ServiceResult,
    ErrorCode,
    DomainError,
    ValidationError,
    ResourceNotFoundError,
    ConflictError,
    BusinessRuleViolation,
    map_error_code_to_http_status
)

__all__ = [
    'ServiceResult',
    'ErrorCode',
    'DomainError',
    'ValidationError',
    'ResourceNotFoundError',
    'ConflictError',
    'BusinessRuleViolation',
    'map_error_code_to_http_status'
]
