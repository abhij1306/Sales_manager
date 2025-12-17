"""
Sensto Sales Manager - Configuration Settings
"""
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Application Info
APP_NAME = "Sensto Sales Manager"
APP_VERSION = "1.0.0"
APP_ICON = "📊"

# Database Settings
DB_PATH = BASE_DIR / "db" / "business.db"
DB_PATH.parent.mkdir(exist_ok=True)

# SQLite Settings
SQLITE_PRAGMAS = {
    "journal_mode": "WAL",
    "synchronous": "NORMAL",
    "cache_size": -64000,  # 64MB
    "foreign_keys": 1,
    "temp_store": 2  # MEMORY
}

# Business Rules
BUSINESS_RULES = {
    "allow_over_dispatch": True,  # Allow dispatch > pending with warning
    "warn_duplicate_po": True,
    "block_missing_gstin": True,
    "warn_missing_hsn": True,
}

# Export Settings
EXPORT_DIR = BASE_DIR / "exports" / "generated"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

# Date Formats
DATE_FORMAT_DISPLAY = "%d/%m/%Y"
DATE_FORMAT_ISO = "%Y-%m-%d"

# Pagination
ITEMS_PER_PAGE = 50

# Streamlit Page Config
PAGE_CONFIG = {
    "page_title": APP_NAME,
    "page_icon": APP_ICON,
    "layout": "wide",
    "initial_sidebar_state": "expanded"
}
