"""
Production-Grade Invoice Router
Implements strict accounting rules with audit-safe transaction handling
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.models import InvoiceListItem, InvoiceCreate, InvoiceStats
from app.errors import bad_request, not_found, conflict, internal_error
from typing import List, Optional
from datetime import datetime
import sqlite3
import uuid
import logging
from pydantic import BaseModel

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


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_invoice_number(db: sqlite3.Connection) -> str:
    """
    Generate collision-safe invoice number: INV/{FY}/{XXX}
    MUST be called inside BEGIN IMMEDIATE transaction
    """
    today = datetime.now()
    
    # Calculate financial year (Apr-Mar)
    if today.month >= 4:
        fy = f"{today.year}-{str(today.year + 1)[2:]}"
    else:
        fy = f"{today.year - 1}-{str(today.year)[2:]}"
    
    # Get last invoice number for this FY
    last_row = db.execute("""
        SELECT invoice_number 
        FROM gst_invoices 
        WHERE invoice_number LIKE ? 
        ORDER BY invoice_number DESC 
        LIMIT 1
    """, (f"INV/{fy}/%",)).fetchone()
    
    if last_row:
        try:
            last_num = int(last_row[0].split('/')[-1])
            new_num = last_num + 1
        except (ValueError, IndexError):
            new_num = 1
    else:
        new_num = 1
    
    return f"INV/{fy}/{new_num:03d}"


def calculate_tax(taxable_value: float, cgst_rate: float = 9.0, sgst_rate: float = 9.0) -> dict:
    """
    Calculate CGST and SGST amounts
    Backend is the source of truth for all monetary calculations
    """
    cgst_amount = round(taxable_value * cgst_rate / 100, 2)
    sgst_amount = round(taxable_value * sgst_rate / 100, 2)
    total = round(taxable_value + cgst_amount + sgst_amount, 2)
    
    return {
        'cgst_amount': cgst_amount,
        'sgst_amount': sgst_amount,
        'total_amount': total
    }


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/stats", response_model=InvoiceStats)
def get_invoice_stats(db: sqlite3.Connection = Depends(get_db)):
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
    db: sqlite3.Connection = Depends(get_db)
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
def get_invoice_detail(invoice_number: str, db: sqlite3.Connection = Depends(get_db)):
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
def create_invoice(request: EnhancedInvoiceCreate, db: sqlite3.Connection = Depends(get_db)):
    """
    Create Invoice from Delivery Challan
    
    CRITICAL CONSTRAINTS:
    - 1 DC → 1 Invoice (enforced)
    - Invoice items are 1-to-1 mapping from DC items
    - Backend recomputes all monetary values
    - Transaction uses BEGIN IMMEDIATE for collision safety
    """
    
    dc_number = request.dc_number
    
    # ========== VALIDATION (before transaction) ==========
    
    if not dc_number or dc_number.strip() == "":
        raise bad_request("DC number is required")
    
    if not request.invoice_date or request.invoice_date.strip() == "":
        raise bad_request("Invoice date is required")
    
    if not request.buyer_name or request.buyer_name.strip() == "":
        raise bad_request("Buyer name is required")
    
    # Check DC exists
    dc_row = db.execute("""
        SELECT dc_number, dc_date, po_number FROM delivery_challans WHERE dc_number = ?
    """, (dc_number,)).fetchone()
    
    if not dc_row:
        raise not_found(f"Delivery Challan {dc_number} not found", "DC")
    
    dc_dict = dict(dc_row)
    
    # ========== BEGIN IMMEDIATE TRANSACTION ==========
    # Acquire write lock immediately to prevent race conditions
    
    try:
        db.execute("BEGIN IMMEDIATE")
        
        try:
            # 1. Check if DC already has invoice (1-DC-1-Invoice constraint)
            existing_invoice = db.execute("""
                SELECT invoice_number FROM gst_invoice_dc_links WHERE dc_number = ?
            """, (dc_number,)).fetchone()
            
            if existing_invoice:
                db.rollback()
                raise conflict(
                    f"DC {dc_number} is already linked to invoice {existing_invoice[0]}",
                    log_details="DC_ALREADY_INVOICED"
                )
            
            # 2. Validate Invoice Number (Manual Entry Required)
            invoice_number = request.invoice_number
            if not invoice_number or invoice_number.strip() == "":
                db.rollback()
                raise bad_request("Invoice Number is required")
            
            # 3. Check for duplicate invoice number
            dup_check = db.execute("""
                SELECT invoice_number FROM gst_invoices WHERE invoice_number = ?
            """, (invoice_number,)).fetchone()
            
            if dup_check:
                db.rollback()
                raise conflict(
                    f"Invoice number {invoice_number} already exists",
                    log_details="DUPLICATE_INVOICE_NUMBER"
                )
            
            # 4. Fetch DC items
            dc_items = db.execute("""
                SELECT 
                    dci.po_item_id,
                    dci.lot_no,
                    dci.dispatch_qty,
                    poi.po_rate,
                    poi.material_description as description,
                    poi.hsn_code
                FROM delivery_challan_items dci
                JOIN purchase_order_items poi ON dci.po_item_id = poi.id
                WHERE dci.dc_number = ?
            """, (dc_number,)).fetchall()
            
            if not dc_items or len(dc_items) == 0:
                db.rollback()
                raise bad_request(f"DC {dc_number} has no items")
            
            # 5. Calculate totals (backend is source of truth)
            invoice_items = []
            total_taxable = 0.0
            total_cgst = 0.0
            total_sgst = 0.0
            total_amount = 0.0
            
            for dc_item in dc_items:
                qty = dc_item['dispatch_qty']
                rate = dc_item['po_rate']
                taxable_value = round(qty * rate, 2)
                
                tax_calc = calculate_tax(taxable_value)
                
                invoice_items.append({
                    'po_sl_no': dc_item['lot_no'] or '',
                    'description': dc_item['description'] or '',
                    'hsn_sac': dc_item['hsn_code'] or '',
                    'quantity': qty,
                    'unit': 'NO',
                    'rate': rate,
                    'taxable_value': taxable_value,
                    'cgst_rate': 9.0,
                    'cgst_amount': tax_calc['cgst_amount'],
                    'sgst_rate': 9.0,
                    'sgst_amount': tax_calc['sgst_amount'],
                    'igst_rate': 0.0,
                    'igst_amount': 0.0,
                    'total_amount': tax_calc['total_amount']
                })
                
                total_taxable += taxable_value
                total_cgst += tax_calc['cgst_amount']
                total_sgst += tax_calc['sgst_amount']
                total_amount += tax_calc['total_amount']
            
            # 6. Insert invoice header
            # IMPORTANT:
            # gst_invoices intentionally uses invoice_number as PRIMARY KEY.
            # DO NOT add surrogate 'id' column.
            # This design is required for accounting and audit correctness.
            
            db.execute("""
                INSERT INTO gst_invoices (
                    invoice_number, invoice_date,
                    linked_dc_numbers, po_numbers,
                    buyer_name, buyer_address, buyer_gstin, buyer_state, buyer_state_code,
                    customer_gstin, place_of_supply,
                    buyers_order_no, buyers_order_date,
                    vehicle_no, lr_no, transporter, destination, terms_of_delivery,
                    gemc_number, mode_of_payment, payment_terms,
                    despatch_doc_no, srv_no, srv_date,
                    taxable_value, cgst, sgst, igst, total_invoice_value,
                    remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                invoice_number, request.invoice_date,
                dc_number, str(dc_dict.get('po_number', '')),
                request.buyer_name, request.buyer_address, request.buyer_gstin,
                request.buyer_state, request.buyer_state_code,
                request.buyer_gstin,  # customer_gstin (legacy field)
                request.place_of_supply,
                request.buyers_order_no, request.buyers_order_date,
                request.vehicle_no, request.lr_no, request.transporter,
                request.destination, request.terms_of_delivery,
                request.gemc_number, request.mode_of_payment, request.payment_terms,
                request.despatch_doc_no, request.srv_no, request.srv_date,
                total_taxable, total_cgst, total_sgst, 0.0, total_amount,
                request.remarks
            ))
            
            # 7. Insert invoice items
            for item in invoice_items:
                db.execute("""
                    INSERT INTO gst_invoice_items (
                        invoice_number, po_sl_no, description, hsn_sac,
                        quantity, unit, rate, taxable_value,
                        cgst_rate, cgst_amount, sgst_rate, sgst_amount,
                        igst_rate, igst_amount, total_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    invoice_number, item['po_sl_no'], item['description'], item['hsn_sac'],
                    item['quantity'], item['unit'], item['rate'], item['taxable_value'],
                    item['cgst_rate'], item['cgst_amount'], item['sgst_rate'], item['sgst_amount'],
                    item['igst_rate'], item['igst_amount'], item['total_amount']
                ))
            
            # 8. Create DC link
            link_id = str(uuid.uuid4())
            db.execute("""
                INSERT INTO gst_invoice_dc_links (id, invoice_number, dc_number)
                VALUES (?, ?, ?)
            """, (link_id, invoice_number, dc_number))
            
            # 9. Commit transaction
            db.commit()
            
            logger.info(f"Successfully created invoice {invoice_number} from DC {dc_number} with {len(invoice_items)} items")
            
            return {
                "success": True,
                "invoice_number": invoice_number,
                "total_amount": total_amount,
                "items_count": len(invoice_items)
            }
            
        except Exception as e:
            db.rollback()
            raise
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except sqlite3.IntegrityError as e:
        logger.error(f"Invoice creation failed due to integrity error: {e}")
        raise internal_error(f"Database integrity error: {str(e)}", e)
    except Exception as e:
        logger.error(f"Unexpected error creating invoice: {e}")
        raise internal_error(f"Failed to create invoice: {str(e)}", e)
