"""
FastAPI Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dashboard, po, dc, invoice, reports, search, alerts, reconciliation, po_notes
from app.db import validate_database_path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Sales Manager API",
    description="Local-first PO-DC-Invoice Management System",
    version="2.0.0"
)

# CORS for localhost frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
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
        logger.error(f"✗ Database validation failed: {e}")
        raise
    
    logger.info("✓ CORS middleware configured")
    logger.info("✓ Routers registered:")
    logger.info("  - Dashboard (/api)")
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
    return {"message": "Sales Manager API v2.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

