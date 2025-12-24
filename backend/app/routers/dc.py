"""
Delivery Challan Router
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.models import DCListItem, DCCreate, DCStats
from app.errors import not_found, internal_error
from app.core.exceptions import (
    DomainError,
    map_error_code_to_http_status
)
from app.services.dc import (
    create_dc as service_create_dc,
    update_dc as service_update_dc,
    check_dc_has_invoice
)
from typing import List, Optional
import sqlite3
import logging
from app.core.auth_utils import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats", response_model=DCStats)
def get_dc_stats(db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Get DC Page Statistics"""
    try:
        # Total Challans
        total_challans = db.execute("SELECT COUNT(*) FROM delivery_challans").fetchone()[0]
        
        # Completed (Linked to Invoice)
        completed = db.execute("""
            SELECT COUNT(DISTINCT dc_number) FROM gst_invoice_dc_links
        """).fetchone()[0]
        
        # Pending (Total - Completed)
        pending = max(0, total_challans - completed)
        
        return {
            "total_challans": total_challans,
            "total_challans_change": 0.0,
            "pending_delivery": pending,
            "completed_delivery": completed,
            "completed_change": 0.0
        }
    except Exception as e:
        logger.error(f"Failed to fetch DC stats: {e}", exc_info=e)
        raise internal_error("Failed to fetch DC statistics", e)


@router.get("/", response_model=List[DCListItem])
def list_dcs(po: Optional[int] = None, db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """List all Delivery Challans, optionally filtered by PO"""
    
    # Optimized query with JOIN to eliminate N+1 problem
    query = """
        SELECT 
            dc.dc_number, 
            dc.dc_date, 
            dc.po_number, 
            dc.consignee_name, 
            dc.created_at,
            (SELECT COUNT(*) FROM gst_invoice_dc_links WHERE dc_number = dc.dc_number) as is_linked,
            COALESCE(SUM(dci.dispatch_qty * poi.po_rate), 0) as total_value
        FROM delivery_challans dc
        LEFT JOIN delivery_challan_items dci ON dc.dc_number = dci.dc_number
        LEFT JOIN purchase_order_items poi ON dci.po_item_id = poi.id
    """
    params = []
    
    if po:
        query += " WHERE dc.po_number = ?"
        params.append(po)
        
    query += " GROUP BY dc.dc_number, dc.dc_date, dc.po_number, dc.consignee_name, dc.created_at"
    query += " ORDER BY dc.created_at DESC"
    
    rows = db.execute(query, params).fetchall()
    
    results = []
    for row in rows:
        # Determine Status
        status = "Delivered" if row["is_linked"] > 0 else "Pending"
        
        results.append(DCListItem(
            dc_number=row["dc_number"],
            dc_date=row["dc_date"],
            po_number=row["po_number"],
            consignee_name=row["consignee_name"],
            status=status,
            total_value=row["total_value"],
            created_at=row["created_at"]
        ))
    
    return results


@router.get("/{dc_number}")
def get_dc_detail(dc_number: str, db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Get Delivery Challan detail with items"""
    
    # Get DC header
    dc_row = db.execute("""
        SELECT * FROM delivery_challans WHERE dc_number = ?
    """, (dc_number,)).fetchone()
    
    if not dc_row:
        raise not_found(f"Delivery Challan {dc_number} not found", "DC")
    
    # Get DC items with PO item details
    items = db.execute("""
        SELECT 
            dci.id,
            dci.dispatch_qty as dispatched_quantity,
            dci.hsn_code,
            dci.hsn_rate,
            dci.lot_no,
            dci.po_item_id,
            poi.po_item_no,
            poi.material_code,
            poi.material_description,
            poi.unit,
            poi.po_rate,
            pod.dely_qty as lot_ordered_qty
        FROM delivery_challan_items dci
        JOIN purchase_order_items poi ON dci.po_item_id = poi.id
        LEFT JOIN purchase_order_deliveries pod ON dci.po_item_id = pod.po_item_id AND dci.lot_no = pod.lot_no
        WHERE dci.dc_number = ?
    """, (dc_number,)).fetchall()
    
    result_items = []
    for item in items:
        item_dict = dict(item)
        
        # Calculate remaining info
        po_item_id = item_dict["po_item_id"]
        lot_no = item_dict["lot_no"]
        lot_ordered = item_dict["lot_ordered_qty"] or 0
        
        if lot_no:
             total_dispatched = db.execute("""
                SELECT COALESCE(SUM(dispatch_qty), 0) FROM delivery_challan_items 
                WHERE po_item_id = ? AND lot_no = ?
             """, (po_item_id, lot_no)).fetchone()[0]
        else:
             total_dispatched = db.execute("""
                SELECT COALESCE(SUM(dispatch_qty), 0) FROM delivery_challan_items 
                WHERE po_item_id = ?
             """, (po_item_id,)).fetchone()[0]
             
        item_dict["remaining_post_dc"] = max(0, lot_ordered - total_dispatched)
        result_items.append(item_dict)

    return {
        "header": dict(dc_row),
        "items": result_items
    }


@router.post("/")
def create_dc(dc: DCCreate, items: List[dict], db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """
    Create new Delivery Challan with items
    items format: [{
        "po_item_id": "uuid", 
        "lot_no": 1,
        "dispatch_qty": 10, 
        "hsn_code": "7326", 
        "hsn_rate": 18
    }]
    """
    
    # Use service layer with transaction protection
    try:
        # CRITICAL: Use BEGIN IMMEDIATE for SQLite concurrency protection
        db.execute("BEGIN IMMEDIATE")
        
        try:
            result = service_create_dc(dc, items, db)
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
        logger.error(f"DC creation failed due to integrity error: {e}", exc_info=e)
        raise internal_error(f"Database integrity error: {str(e)}", e)


@router.get("/{dc_number}/invoice")
def check_dc_has_invoice_endpoint(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Check if DC has an associated GST Invoice"""
    invoice_number = check_dc_has_invoice(dc_number, db)
    
    if invoice_number:
        return {
            "has_invoice": True,
            "invoice_number": invoice_number
        }
    else:
        return {"has_invoice": False}


@router.put("/{dc_number}")
def update_dc(dc_number: str, dc: DCCreate, items: List[dict], db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Update existing Delivery Challan - BLOCKED if invoice exists"""
    
    # Use service layer with transaction protection
    try:
        # CRITICAL: Use BEGIN IMMEDIATE for SQLite concurrency protection
        db.execute("BEGIN IMMEDIATE")
        
        try:
            result = service_update_dc(dc_number, dc, items, db)
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
        logger.error(f"DC update failed due to integrity error: {e}", exc_info=e)
        raise internal_error(f"Database integrity error: {str(e)}", e)

@router.delete("/{dc_number}")
def delete_dc(dc_number: str, db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """
    Delete a Delivery Challan.
    Safe Deletion Rule: Cannot delete if linked Invoices exist.
    """
    # 1. Check for linked Invoices
    cursor = db.cursor()
    # Note: Using LIKE because linked_dc_numbers might store comma-separated values
    # A robust implementation would use a join table, but we follow the existing schema
    # Actually, check_dc_has_invoice uses gst_invoice_dc_links table, let's use that

    cursor.execute("SELECT COUNT(*) FROM gst_invoice_dc_links WHERE dc_number = ?", (dc_number,))
    inv_count = cursor.fetchone()[0]

    if inv_count > 0:
        # Get the invoice number for better error message
        cursor.execute("SELECT invoice_number FROM gst_invoice_dc_links WHERE dc_number = ? LIMIT 1", (dc_number,))
        inv_num = cursor.fetchone()[0]
        from app.errors import bad_request
        raise bad_request(f"Cannot delete DC-{dc_number}: Linked to Invoice {inv_num}. Delete invoice first.")

    try:
        # 2. Get items to revert (Reversal Logic)
        # We need to know which PO items were dispatched to revert their 'delivered_qty' if stored
        # Currently, delivered_qty is calculated on the fly or stored in po_items/deliveries
        # Let's check where it's stored.
        # Looking at get_dc_detail, it calculates dispatched from delivery_challan_items
        # So deleting delivery_challan_items effectively reverts the calculation.
        # However, if there are any materialized aggregates, we must update them.
        # Assuming on-the-fly calculation for now based on 'get_dc_detail'.

        # 3. Delete items
        cursor.execute("DELETE FROM delivery_challan_items WHERE dc_number = ?", (dc_number,))

        # 4. Delete DC Header
        cursor.execute("DELETE FROM delivery_challans WHERE dc_number = ?", (dc_number,))

        db.commit()
        return {"success": True, "message": f"DC-{dc_number} deleted successfully"}

    except Exception as e:
        db.rollback()
        from app.errors import internal_error
        raise internal_error(f"Failed to delete DC: {str(e)}")
