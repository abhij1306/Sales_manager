"""
FastAPI Database Connection Manager
Handles SQLite connection with WAL mode and explicit transactions
"""
import sqlite3
from pathlib import Path
from typing import Generator
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

DATABASE_PATH = Path(__file__).parent.parent / "database" / "business.db"


def validate_database_path():
    """Validate database path exists and is accessible"""
    if not DATABASE_PATH.parent.exists():
        raise RuntimeError(f"Database directory does not exist: {DATABASE_PATH.parent}")
    
    # Create database file if it doesn't exist
    if not DATABASE_PATH.exists():
        logger.warning(f"Database file not found, will be created: {DATABASE_PATH}")
    else:
        logger.info(f"Database path validated: {DATABASE_PATH}")


def get_connection() -> sqlite3.Connection:
    """Get a new database connection with row factory"""
    try:
        conn = sqlite3.connect(str(DATABASE_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        logger.debug(f"Database connection established: {DATABASE_PATH}")
        return conn
    except sqlite3.Error as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Dependency for FastAPI routes"""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
        logger.debug("Transaction committed successfully")
    except Exception as e:
        conn.rollback()
        logger.error(f"Transaction rolled back due to error: {e}")
        raise
    finally:
        conn.close()
        logger.debug("Database connection closed")


@contextmanager
def db_transaction(conn: sqlite3.Connection):
    """
    Explicit transaction context manager
    Use this for operations that require atomic multi-step writes
    
    Example:
        with db_transaction(db):
            db.execute("INSERT INTO table1 ...")
            db.execute("INSERT INTO table2 ...")
    """
    try:
        logger.debug("Starting explicit transaction")
        yield conn
        conn.commit()
        logger.debug("Explicit transaction committed")
    except Exception as e:
        conn.rollback()
        logger.error(f"Explicit transaction rolled back: {e}")
        raise
