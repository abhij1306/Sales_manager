import sqlite3
import os

DATABASE_PATH = os.path.join(os.getcwd(), "database", "business.db")

def reset():
    print(f"Resetting users table in {DATABASE_PATH}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS users")
    conn.commit()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    reset()
