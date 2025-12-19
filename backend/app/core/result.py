"""
Core Result Types for Service Layer
Enables service agnosticism - services can be called from HTTP routers or AI agents
"""
from dataclasses import dataclass
from typing import Generic, TypeVar, Optional
from enum import Enum


T = TypeVar('T')


class ErrorCode(str, Enum):
    """Standard error codes for service layer"""
    # Validation Errors (400)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    
    # Not Found Errors (404)
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    PO_NOT_FOUND = "PO_NOT_FOUND"
    DC_NOT_FOUND = "DC_NOT_FOUND"
    INVOICE_NOT_FOUND = "INVOICE_NOT_FOUND"
    
    # Conflict Errors (409)
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE"
    DC_ALREADY_INVOICED = "DC_ALREADY_INVOICED"
    INVOICE_NUMBER_EXISTS = "INVOICE_NUMBER_EXISTS"
    
    # Business Logic Errors (422)
    INSUFFICIENT_QUANTITY = "INSUFFICIENT_QUANTITY"
    INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION"
    
    # Internal Errors (500)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


@dataclass
class ServiceResult(Generic[T]):
    """
    Generic result type for service layer operations
    Decouples business logic from HTTP concerns
    
    Usage:
        # Success case
        return ServiceResult(success=True, data=created_dc)
        
        # Error case
        return ServiceResult(
            success=False,
            error_code=ErrorCode.VALIDATION_ERROR,
            message="Dispatch quantity exceeds remaining quantity"
        )
    """
    success: bool
    data: Optional[T] = None
    error_code: Optional[ErrorCode] = None
    message: Optional[str] = None
    details: Optional[dict] = None
    
    @classmethod
    def ok(cls, data: T) -> 'ServiceResult[T]':
        """Create a successful result"""
        return cls(success=True, data=data)
    
    @classmethod
    def fail(
        cls,
        error_code: ErrorCode,
        message: str,
        details: Optional[dict] = None
    ) -> 'ServiceResult[T]':
        """Create a failed result"""
        return cls(
            success=False,
            error_code=error_code,
            message=message,
            details=details
        )
    
    def unwrap(self) -> T:
        """
        Get the data or raise an exception
        Use with caution - prefer checking success flag
        """
        if not self.success:
            raise ValueError(f"Cannot unwrap failed result: {self.message}")
        return self.data  # type: ignore


# ============================================================
# DOMAIN EXCEPTIONS
# ============================================================

class DomainError(Exception):
    """
    Base exception for domain/business logic errors
    Services raise these instead of HTTPException
    Routers convert these to appropriate HTTP responses
    """
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        details: Optional[dict] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(DomainError):
    """Raised when input validation fails (maps to 400)"""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            details=details
        )


class ResourceNotFoundError(DomainError):
    """Raised when a resource is not found (maps to 404)"""
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} '{resource_id}' not found",
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            details={"resource_type": resource_type, "resource_id": resource_id}
        )


class ConflictError(DomainError):
    """Raised when a resource conflict occurs (maps to 409)"""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.RESOURCE_CONFLICT,
            details=details
        )


class BusinessRuleViolation(DomainError):
    """Raised when a business rule is violated (maps to 422)"""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
            details=details
        )


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def map_error_code_to_http_status(error_code: ErrorCode) -> int:
    """
    Map error codes to HTTP status codes
    Used by routers to convert domain errors to HTTP responses
    """
    mapping = {
        # 400 - Bad Request
        ErrorCode.VALIDATION_ERROR: 400,
        ErrorCode.INVALID_INPUT: 400,
        
        # 404 - Not Found
        ErrorCode.RESOURCE_NOT_FOUND: 404,
        ErrorCode.PO_NOT_FOUND: 404,
        ErrorCode.DC_NOT_FOUND: 404,
        ErrorCode.INVOICE_NOT_FOUND: 404,
        
        # 409 - Conflict
        ErrorCode.RESOURCE_CONFLICT: 409,
        ErrorCode.DUPLICATE_RESOURCE: 409,
        ErrorCode.DC_ALREADY_INVOICED: 409,
        ErrorCode.INVOICE_NUMBER_EXISTS: 409,
        
        # 422 - Unprocessable Entity
        ErrorCode.BUSINESS_RULE_VIOLATION: 422,
        ErrorCode.INSUFFICIENT_QUANTITY: 422,
        ErrorCode.INVALID_STATE_TRANSITION: 422,
        
        # 500 - Internal Server Error
        ErrorCode.INTERNAL_ERROR: 500,
        ErrorCode.DATABASE_ERROR: 500,
    }
    return mapping.get(error_code, 500)
