"""
FastAPI Main Application with Structured Logging and Observability
"""
from app.core.config import settings
from app.core.exceptions import AppException
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dashboard, po, dc, invoice, reports, search, alerts, reconciliation, po_notes, health, voice, smart_reports, ai_reports, auth, srv
from app.middleware import RequestLoggingMiddleware
from app.core.logging_config import setup_logging
from app.db import validate_database_path
import logging
import uuid # For error tracing

# Setup structured logging
setup_logging(log_level="INFO", use_json=False)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Local-first PO-DC-Invoice Management System with AI/Voice capabilities",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS for localhost frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Include routers
app.include_router(auth.router)
app.include_router(srv.router, prefix="/api", tags=["SRV"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice Agent"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(po.router, prefix="/api/po", tags=["Purchase Orders"])
app.include_router(dc.router, prefix="/api/dc", tags=["Delivery Challans"])
app.include_router(invoice.router, prefix="/api/invoice", tags=["Invoices"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(smart_reports.router, prefix="/api/smart-reports", tags=["Smart Reports"])
app.include_router(ai_reports.router, prefix="/api/ai-reports", tags=["AI Reports"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["Reconciliation"])
app.include_router(po_notes.router, prefix="/api/po-notes", tags=["PO Notes"])

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """
    Handle defined Application Exceptions
    Transform them into clean JSON responses with error codes.
    """
    logger.warning(f"AppException: {exc.error_code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "request_id": str(uuid.uuid4())
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for unhandled exceptions (500 Internal Server Error).
    Prevents leaking stack traces to client.
    """
    error_id = str(uuid.uuid4())
    logger.error(f"Unhandled Exception {error_id}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please contact support with this Error ID.",
            "error_id": error_id
        }
    )

@app.on_event("startup")
async def startup_event():
    """Application startup - validate database and log initialization"""
    logger.info("=" * 60)
    logger.info(f"{settings.PROJECT_NAME} v2.0 - STARTING UP")
    logger.info("=" * 60)
    
    # 1. Database Validation
    db_status = "❌ Failed"
    try:
        validate_database_path()
        db_status = "✅ Connected"
    except Exception as e:
        logger.error(f"Database validation failed: {e}")
        # We don't raise here immediately to allow full diagnostics table to print, 
        # but in strict mode we might want to. 
        # For now, let's print the table then maybe raise if DB is critical (it is).
        db_status = "❌ CRITICAL FAILURE"

    # 2. Key Validation
    groq_status = "✅ Loaded" if settings.GROQ_API_KEY else "⚪ Skipped"
    openai_status = "✅ Loaded" if settings.OPENAI_API_KEY else "⚪ Skipped"
    openrouter_status = "✅ Loaded" if settings.OPENROUTER_API_KEY else "⚪ Skipped"

    # 3. Print Diagnostic Table
    logger.info("┌──────────────────────────────────────────────────────────────┐")
    logger.info("│                   SYSTEM HEALTH DIAGNOSTICS                  │")
    logger.info("├──────────────────────────────┬───────────────────────────────┤")
    logger.info(f"│ Database Connection          │ {db_status:<29} │")
    logger.info(f"│ GROQ_API_KEY                 │ {groq_status:<29} │")
    logger.info(f"│ OPENAI_API_KEY               │ {openai_status:<29} │")
    logger.info(f"│ OPENROUTER_API_KEY           │ {openrouter_status:<29} │")
    logger.info(f"│ Environment Mode             │ {settings.ENV_MODE:<29} │")
    logger.info("└──────────────────────────────┴───────────────────────────────┘")

    if "CRITICAL" in db_status:
        logger.error("Startup aborted due to critical infrastructure failure.")
        raise RuntimeError("Database connection failed")

    logger.info("✓ System ready. Listening for requests...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Sales Manager API - Shutting down")

@app.get("/")
def root():
    return {
        "message": f"{settings.PROJECT_NAME} v2.0",
        "status": "running",
        "docs": "/api/docs",
        "health": "/api/health"
    }
