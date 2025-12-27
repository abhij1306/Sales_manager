import sys
import os

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.main import app

for route in app.routes:
    print(f"{route.path} {route.name}")
