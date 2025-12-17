"""
Number utility functions for Sales Manager
"""
from typing import Optional, Union

def to_int(value: Optional[Union[str, int, float]]) -> Optional[int]:
    """
    Convert value to integer, handling None and string inputs
    
    Args:
        value: Value to convert (can be str, int, float, or None)
        
    Returns:
        Integer value or None if conversion fails
    """
    if value is None:
        return None
    
    if isinstance(value, int):
        return value
    
    if isinstance(value, float):
        return int(value)
    
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        
        # Remove common formatting characters
        value = value.replace(',', '').replace(' ', '')
        
        try:
            # Try converting to float first (handles decimals), then to int
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    return None


def to_float(value: Optional[Union[str, int, float]]) -> Optional[float]:
    """
    Convert value to float, handling None and string inputs
    
    Args:
        value: Value to convert (can be str, int, float, or None)
        
    Returns:
        Float value or None if conversion fails
    """
    if value is None:
        return None
    
    if isinstance(value, (int, float)):
        return float(value)
    
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        
        # Remove common formatting characters
        value = value.replace(',', '').replace(' ', '')
        
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    return None
