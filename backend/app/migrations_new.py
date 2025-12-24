import sqlite3
import logging

logger = logging.getLogger(__name__)

def migrate(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # 1. Create Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Create SRV Receipts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS srv_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        srv_number TEXT UNIQUE NOT NULL,
        srv_date DATE,
        po_number TEXT REFERENCES purchase_orders(po_number),
        received_qty REAL DEFAULT 0.0,
        accepted_qty REAL DEFAULT 0.0,
        rejected_qty REAL DEFAULT 0.0,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id)
    )
    """)

    # 3. Add user_id to existing tables (if not exists)
    # SQLite doesn't support IF NOT EXISTS for columns, so we try/except
    tables_to_update = ['purchase_orders', 'delivery_challans', 'gst_invoices']

    for table in tables_to_update:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER REFERENCES users(id)")
            logger.info(f"Added user_id column to {table}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                pass
            else:
                logger.error(f"Error altering {table}: {e}")

    conn.commit()
