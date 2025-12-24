"""
Production-Grade Invoice Router
Implements strict accounting rules with audit-safe transaction handling
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.models import InvoiceListItem, InvoiceCreate, InvoiceStats
from app.errors import not_found, internal_error
from app.core.exceptions import (
    DomainError,
    map_error_code_to_http_status
)
from app.services.invoice import create_invoice as service_create_invoice
from typing import List, Optional
import sqlite3
import logging
from pydantic import BaseModel
from app.core.auth_utils import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class InvoiceItemCreate(BaseModel):
    po_sl_no: str  # lot_no from DC
    description: str
    quantity: float
    unit: str = "NO"
    rate: float
    hsn_sac: Optional[str] = None
    no_of_packets: Optional[int] = None

class EnhancedInvoiceCreate(BaseModel):
    # Will be auto-generated if not provided
    invoice_number: Optional[str] = None
    invoice_date: str
    
    # DC reference (required)
    dc_number: str
    
    # Buyer details (editable)
    buyer_name: str
    buyer_address: Optional[str] = None
    buyer_gstin: Optional[str] = None
    buyer_state: Optional[str] = None
    buyer_state_code: Optional[str] = None
    place_of_supply: Optional[str] = None
    
    # Order details (from DC/PO, read-only on frontend)
    buyers_order_no: Optional[str] = None
    buyers_order_date: Optional[str] = None
    
    # Transport details
    vehicle_no: Optional[str] = None
    lr_no: Optional[str] = None
    transporter: Optional[str] = None
    destination: Optional[str] = None
    terms_of_delivery: Optional[str] = None
    
    # Optional fields
    gemc_number: Optional[str] = None
    mode_of_payment: Optional[str] = None
    payment_terms: str = "45 Days"
    despatch_doc_no: Optional[str] = None
    srv_no: Optional[str] = None
    srv_date: Optional[str] = None
    remarks: Optional[str] = None
    
    # Items with overrides
    items: Optional[List[InvoiceItemCreate]] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/stats", response_model=InvoiceStats)
def get_invoice_stats(db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Get Invoice Page Statistics"""
    try:
        total_row = db.execute("SELECT SUM(total_invoice_value) FROM gst_invoices").fetchone()
        total_invoiced = total_row[0] if total_row and total_row[0] else 0.0

        gst_row = db.execute("SELECT SUM(cgst + sgst + igst) FROM gst_invoices").fetchone()
        gst_collected = gst_row[0] if gst_row and gst_row[0] else 0.0

        pending_payments = 0.0
        pending_payments_count = 0
        
        return {
            "total_invoiced": total_invoiced,
            "pending_payments": pending_payments,
            "gst_collected": gst_collected,
            "total_invoiced_change": 0.0,
            "gst_collected_change": 0.0,
            "pending_payments_count": pending_payments_count
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return {
            "total_invoiced": 0, "pending_payments": 0, "gst_collected": 0,
            "total_invoiced_change": 0, "pending_payments_count": 0, "gst_collected_change": 0
        }


@router.get("/", response_model=List[InvoiceListItem])
def list_invoices(
    po: Optional[int] = None, 
    dc: Optional[str] = None, 
    status: Optional[str] = None, 
    db: sqlite3.Connection = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all Invoices, optionally filtered by PO, DC, or Status"""
    
    query = """
        SELECT 
            invoice_number, invoice_date, po_numbers, linked_dc_numbers,
            customer_gstin, taxable_value, total_invoice_value, created_at
        FROM gst_invoices
        WHERE 1=1
    """
    params = []

    if po:
        query += " AND po_numbers LIKE ?"
        params.append(f"%{po}%")
    
    if dc:
        query += " AND linked_dc_numbers LIKE ?"
        params.append(f"%{dc}%")

    query += " ORDER BY created_at DESC"
    rows = db.execute(query, tuple(params)).fetchall()
    
    return [InvoiceListItem(**dict(row)) for row in rows]


@router.get("/{invoice_number}")
def get_invoice_detail(invoice_number: str, db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Get Invoice detail with items and linked DCs"""
    
    invoice_row = db.execute("""
        SELECT * FROM gst_invoices WHERE invoice_number = ?
    """, (invoice_number,)).fetchone()
    
    if not invoice_row:
        raise not_found(f"Invoice {invoice_number} not found", "Invoice")
    
    # Get invoice items
    items = db.execute("""
        SELECT * FROM gst_invoice_items WHERE invoice_number = ? ORDER BY id
    """, (invoice_number,)).fetchall()
    
    # Get linked DCs
    dc_links = db.execute("""
        SELECT dc.* 
        FROM gst_invoice_dc_links link
        JOIN delivery_challans dc ON link.dc_number = dc.dc_number
        WHERE link.invoice_number = ?
    """, (invoice_number,)).fetchall()
    
    return {
        "header": dict(invoice_row),
        "items": [dict(item) for item in items],
        "linked_dcs": [dict(dc) for dc in dc_links]
    }


@router.post("/")
def create_invoice(request: EnhancedInvoiceCreate, db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """
    Create Invoice from Delivery Challan
    
    CRITICAL CONSTRAINTS:
    - 1 DC → 1 Invoice (enforced via INVARIANT DC-2)
    - Invoice items are 1-to-1 mapping from DC items
    - Backend recomputes all monetary values (INVARIANT INV-2)
    - Transaction uses BEGIN IMMEDIATE for collision safety
    """
    
    # Convert Pydantic model to dict for service layer
    invoice_data = request.dict()
    
    # Use service layer with transaction protection
    try:
        # CRITICAL: Use BEGIN IMMEDIATE for SQLite concurrency protection
        db.execute("BEGIN IMMEDIATE")
        
        try:
            result = service_create_invoice(invoice_data, db)
            db.commit()
            
            # Service returns ServiceResult - extract data
            if result.success:
                return result.data
            else:
                # Should not happen if service raises DomainError
                raise HTTPException(
                    status_code=500,
                    detail=result.message or "Unknown error"
                )
                
        except DomainError as e:
            # Convert domain error to HTTP response
            db.rollback()
            status_code = map_error_code_to_http_status(e.error_code)
            raise HTTPException(
                status_code=status_code,
                detail={
                    "message": e.message,
                    "error_code": e.error_code.value,
                    "details": e.details
                }
            )
        except Exception as e:
            db.rollback()
            raise
            
    except sqlite3.IntegrityError as e:
        logger.error(f"Invoice creation failed due to integrity error: {e}", exc_info=e)
        raise internal_error(f"Database integrity error: {str(e)}", e)
