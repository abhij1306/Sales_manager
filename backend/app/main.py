from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Import raw SQLite utils if needed, but here we just mount routers
# Ensure we don't import deleted modules
from app.routers import po, dc, invoice, auth, srv, reports, dashboard
from app.db import get_db, get_connection

# Initialize DB (create tables if needed) - handled by migrations/init scripts usually
# But if we want to ensure tables exist, we might need a setup script.
# For now, we assume the DB is initialized or routers handle it.
# Actually, the previous main.py had `Base.metadata.create_all`.
# Since we are using raw SQLite, we rely on schema.sql or migration scripts.
# We will assume schema is managed elsewhere or by the `init_db` script.

app = FastAPI(
    title="SenstoSales ERP",
    description="Backend for Senstographic Supplier ERP",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# We mount them under /api prefix to match frontend expectations
# Routers that have their own prefix (auth=/auth, dashboard=/dashboard) are mounted under /api
# Routers without prefix (po, dc, invoice...) are given specific prefixes

app.include_router(auth.router, prefix="/api")        # /api/auth/...
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])

app.include_router(po.router, prefix="/api/po", tags=["po"])
app.include_router(dc.router, prefix="/api/dc", tags=["dc"])
app.include_router(invoice.router, prefix="/api/invoice", tags=["invoices"])
app.include_router(srv.router, prefix="/api/srv", tags=["srv"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/")
def read_root():
    return {"status": "active", "system": "SenstoSales ERP"}
