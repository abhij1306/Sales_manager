"""
FastAPI Main Application with Structured Logging and Observability
"""
# Load .env file using custom loader (no external deps)
import app.core.config

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dashboard, po, dc, invoice, reports, search, alerts, reconciliation, po_notes, health, voice
from app.middleware import RequestLoggingMiddleware
from app.core.logging_config import setup_logging
from app.db import validate_database_path
import logging
import os

# Setup structured logging
log_level = os.getenv("LOG_LEVEL", "INFO")
use_json_logs = os.getenv("JSON_LOGS", "false").lower() == "true"
setup_logging(log_level=log_level, use_json=use_json_logs)

logger = logging.getLogger(__name__)

# Log API key status
groq_key = os.getenv("GROQ_API_KEY")
openrouter_key = os.getenv("OPENROUTER_API_KEY")
logger.info(f"GROQ_API_KEY: {'✅ Set' if groq_key else '❌ Not set'}")
logger.info(f"OPENROUTER_API_KEY: {'✅ Set' if openrouter_key else '❌ Not set'}")

app = FastAPI(
    title="Sales Manager API",
    description="Local-first PO-DC-Invoice Management System with AI/Voice capabilities",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS for localhost frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice Agent"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(po.router, prefix="/api/po", tags=["Purchase Orders"])
app.include_router(dc.router, prefix="/api/dc", tags=["Delivery Challans"])
app.include_router(invoice.router, prefix="/api/invoice", tags=["Invoices"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["Reconciliation"])
app.include_router(po_notes.router, prefix="/api/po-notes", tags=["PO Notes"])



@app.on_event("startup")
async def startup_event():
    """Application startup - validate database and log initialization"""
    logger.info("=" * 60)
    logger.info("Sales Manager API v2.0 - Starting Up")
    logger.info("=" * 60)
    
    try:
        validate_database_path()
        logger.info("✓ Database connection validated")
    except Exception as e:
        logger.error(f"✗ Database validation failed: {e}", exc_info=True)
        raise
    
    logger.info("✓ Structured logging configured")
    logger.info("✓ Request logging middleware enabled")
    logger.info("✓ CORS middleware configured")
    logger.info("✓ Routers registered:")
    logger.info("  - Health (/api/health, /api/health/ready, /api/health/metrics)")
    logger.info("  - Dashboard (/api/dashboard)")
    logger.info("  - Purchase Orders (/api/po)")
    logger.info("  - Delivery Challans (/api/dc)")
    logger.info("  - Invoices (/api/invoice)")
    logger.info("  - Reports (/api/reports)")
    logger.info("  - Search (/api/search)")
    logger.info("  - Alerts (/api/alerts)")
    logger.info("  - Reconciliation (/api/reconciliation)")
    logger.info("  - PO Notes (/api/po-notes)")
    logger.info("=" * 60)
    logger.info("Application ready to accept requests")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("Sales Manager API - Shutting down")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Sales Manager API v2.0",
        "status": "running",
        "docs": "/api/docs",
        "health": "/api/health"
    }
