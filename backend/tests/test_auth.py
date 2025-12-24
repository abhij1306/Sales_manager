import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.main import app

client = TestClient(app)

def test_routes():
    print("Routes:")
    for route in app.routes:
        print(f"{route.path} {route.name}")

def test_login_url():
    url = app.url_path_for("login_for_access_token")
    print(f"Login URL: {url}")
    assert url == "/api/auth/token"

def test_register_and_login():
    # 1. Register
    response = client.post(
        "/api/auth/register",
        data={"username": "testuser", "password": "testpassword", "role": "user"}
    )
    print(f"Register status: {response.status_code}")
    print(f"Register body: {response.text}")
    assert response.status_code in [200, 400]

    # 2. Login
    response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "testpassword"}
    )
    print(f"Login status: {response.status_code}")
    print(f"Login body: {response.text}")
    assert response.status_code == 200
