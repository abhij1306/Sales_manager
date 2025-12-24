from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.db import get_connection
from app.core.auth_utils import create_access_token, get_password_hash, verify_password, Token, get_current_user, TokenData
import sqlite3
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class UserRegister(BaseModel):
    username: str
    password: str

@router.post("/register", response_model=Token)
async def register(user: UserRegister):
    conn = get_connection()
    cursor = conn.cursor()

    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE username = ?", (user.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    hashed_password = get_password_hash(user.password)

    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (user.username, hashed_password)
        )
        conn.commit()
        user_id = cursor.lastrowid

        access_token = create_access_token(data={"sub": user.username, "id": user_id})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE username = ?", (form_data.username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(form_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user['username'], "id": user['id']})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=TokenData)
async def read_users_me(current_user: TokenData = Depends(get_current_user)):
    return current_user
