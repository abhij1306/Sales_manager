"""
Invoice Router
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db, db_transaction
from app.models import InvoiceListItem, InvoiceCreate, InvoiceStats
from app.errors import bad_request, not_found, conflict
from typing import List, Optional
import sqlite3
import uuid
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

class InvoiceCreateRequest(InvoiceCreate):
    dc_numbers: List[str]


@router.get("/stats", response_model=InvoiceStats)
def get_invoice_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get Invoice Page Statistics"""
    try:
        # Get total invoiced value
        total_row = db.execute("SELECT SUM(total_invoice_value) FROM gst_invoices").fetchone()
        total_invoiced = total_row[0] if total_row and total_row[0] else 0.0

        # Get GST collected
        gst_row = db.execute("SELECT SUM(cgst + sgst + igst) FROM gst_invoices").fetchone()
        gst_collected = gst_row[0] if gst_row and gst_row[0] else 0.0

        # Mock data for pending payments (would need a payments table/status for real data)
        pending_payments = total_invoiced * 0.25  # Mock: 25% pending
        pending_payments_count = 15 # Mock
        
        return {
            "total_invoiced": total_invoiced,
            "pending_payments": pending_payments,
            "gst_collected": gst_collected,
            "total_invoiced_change": 12.0,  # Mock
            "gst_collected_change": 5.0,    # Mock
            "pending_payments_count": pending_payments_count
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return {
            "total_invoiced": 0, "pending_payments": 0, "gst_collected": 0,
            "total_invoiced_change": 0, "pending_payments_count": 0, "gst_collected_change": 0
        }

@router.get("/", response_model=List[InvoiceListItem])
def list_invoices(po: Optional[int] = None, dc: Optional[str] = None, status: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """List all Invoices, optionally filtered by PO, DC, or Status"""
    
    query = """
        SELECT 
            invoice_number, 
            invoice_date, 
            po_numbers, 
            linked_dc_numbers,
            customer_gstin,
            taxable_value,
            total_invoice_value, 
            created_at
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
    
    # if status: ... (implement when status column exists)

    query += " ORDER BY created_at DESC"

    rows = db.execute(query, tuple(params)).fetchall()
    
    return [InvoiceListItem(**dict(row)) for row in rows]


@router.get("/{invoice_number}")
def get_invoice_detail(invoice_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Get Invoice detail with linked DCs"""
    
    invoice_row = db.execute("""
        SELECT * FROM gst_invoices WHERE invoice_number = ?
    """, (invoice_number,)).fetchone()
    
    if not invoice_row:
        raise not_found(f"Invoice {invoice_number} not found", "Invoice")
    
    # Get linked DCs
    dc_links = db.execute("""
        SELECT dc.* 
        FROM gst_invoice_dc_links link
        JOIN delivery_challans dc ON link.dc_number = dc.dc_number
        WHERE link.invoice_number = ?
    """, (invoice_number,)).fetchall()
    
    return {
        "header": dict(invoice_row),
        "linked_dcs": [dict(dc) for dc in dc_links]
    }


@router.post("/")
def create_invoice(request: InvoiceCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Create new Invoice and link to DCs
    Request body must include invoice details and dc_numbers list
    """
    invoice = request
    dc_numbers = request.dc_numbers
    
    # ========== VALIDATION ==========
    
    # 1. Validate invoice header
    if not invoice.invoice_number or invoice.invoice_number.strip() == "":
        raise bad_request("Invoice number is required")
    
    if not invoice.invoice_date or invoice.invoice_date.strip() == "":
        raise bad_request("Invoice date is required")
    
    # 2. Validate DC numbers
    if not dc_numbers or len(dc_numbers) == 0:
        raise bad_request("At least one DC must be linked to the invoice")
    
    logger.debug(f"Creating invoice {invoice.invoice_number} with {len(dc_numbers)} DCs")
    
    # 3. Check for duplicate invoice number
    existing = db.execute("""
        SELECT invoice_number FROM gst_invoices WHERE invoice_number = ?
    """, (invoice.invoice_number,)).fetchone()
    
    if existing:
        raise conflict(
            f"Invoice number {invoice.invoice_number} already exists",
            log_details="Duplicate invoice number"
        )
    
    # 4. Validate each DC exists
    for dc_num in dc_numbers:
        dc_row = db.execute("""
            SELECT dc_number FROM delivery_challans WHERE dc_number = ?
        """, (dc_num,)).fetchone()
        
        if not dc_row:
            raise bad_request(f"Delivery Challan {dc_num} not found")
    
    # ========== INSERT ==========
    
    try:
        invoice_id = str(uuid.uuid4())
        
        with db_transaction(db):
            # Insert invoice
            db.execute("""
                INSERT INTO gst_invoices
                (id, invoice_number, invoice_date, linked_dc_numbers, po_numbers, customer_gstin,
                 place_of_supply, taxable_value, cgst, sgst, igst, total_invoice_value, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                invoice_id,
                invoice.invoice_number, invoice.invoice_date, invoice.linked_dc_numbers,
                invoice.po_numbers, invoice.customer_gstin, invoice.place_of_supply,
                invoice.taxable_value, invoice.cgst, invoice.sgst, invoice.igst,
                invoice.total_invoice_value, invoice.remarks
            ))
            
            # Create DC links
            for dc_num in dc_numbers:
                link_id = str(uuid.uuid4())
                db.execute("""
                    INSERT INTO gst_invoice_dc_links (id, invoice_number, dc_number)
                    VALUES (?, ?, ?)
                """, (link_id, invoice.invoice_number, dc_num))
            
            logger.info(f"Successfully created invoice {invoice.invoice_number} with {len(dc_numbers)} DC links")
            
            return {
                "success": True,
                "invoice_number": invoice.invoice_number,
                "invoice_id": invoice_id
            }
            
    except sqlite3.IntegrityError as e:
        logger.error(f"Invoice creation failed due to integrity error: {e}")
        raise bad_request(f"Invoice creation failed: {str(e)}")


