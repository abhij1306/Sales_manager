import sys
import os
import sqlite3
from passlib.context import CryptContext

# Setup path
sys.path.append(os.path.join(os.getcwd(), "app"))

# We can't easily import app.core.auth_utils if dependencies are tricky,
# so I'll just use passlib directly here for simplicity and robustness.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

DATABASE_PATH = os.path.join(os.getcwd(), "database", "business.db")

def seed_admin():
    print(f"Seeding admin user in {DATABASE_PATH}")

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Ensure users table exists (it should, but just in case)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    username = "admin"
    password = "admin"
    hashed = get_password_hash(password)
    role = "admin"

    try:
        cursor.execute(
            "INSERT INTO users (username, hashed_password, role) VALUES (?, ?, ?)",
            (username, hashed, role)
        )
        print("Admin user created successfully.")
    except sqlite3.IntegrityError:
        print("Admin user already exists. Updating password.")
        cursor.execute(
            "UPDATE users SET hashed_password = ?, role = ? WHERE username = ?",
            (hashed, role, username)
        )

    conn.commit()
    conn.close()

if __name__ == "__main__":
    seed_admin()
