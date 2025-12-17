"""
Date utility functions for Sales Manager
"""
from datetime import datetime
from typing import Optional

def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Normalize date string to ISO format (YYYY-MM-DD)
    Handles various input formats: DD/MM/YYYY, DD-MM-YYYY, etc.
    
    Args:
        date_str: Date string in various formats
        
    Returns:
        ISO format date string (YYYY-MM-DD) or None if invalid
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    date_str = date_str.strip()
    if not date_str:
        return None
    
    # Common date formats to try
    formats = [
        "%d/%m/%Y",      # 17/12/2025
        "%d-%m-%Y",      # 17-12-2025
        "%Y-%m-%d",      # 2025-12-17 (already ISO)
        "%d.%m.%Y",      # 17.12.2025
        "%d %b %Y",      # 17 Dec 2025
        "%d %B %Y",      # 17 December 2025
        "%Y/%m/%d",      # 2025/12/17
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    # If no format matches, return None
    return None
