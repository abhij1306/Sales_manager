"""
FastAPI Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dashboard, po, dc, invoice, reports, search, alerts, reconciliation, po_notes

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

@app.get("/")
def root():
    return {"message": "Sales Manager API v2.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
