"""
Delivery Challan Router
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db, db_transaction
from app.models import DCListItem, DCCreate, DCStats
from app.errors import bad_request, not_found, forbidden
from typing import List, Optional
import sqlite3
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats", response_model=DCStats)
def get_dc_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get DC Page Statistics"""
    try:
        # Total Challans
        total_challans = db.execute("SELECT COUNT(*) FROM delivery_challans").fetchone()[0]
        
        # Completed (Linked to Invoice)
        # Assuming DCs in gst_invoice_dc_links are "Completed" or "Delivered" state
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
         return {
            "total_challans": 0, "total_challans_change": 0.0,
            "pending_delivery": 0, "completed_delivery": 0, "completed_change": 0.0
        }


@router.get("/", response_model=List[DCListItem])
def list_dcs(po: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    """List all Delivery Challans, optionally filtered by PO"""
    
    query = """
        SELECT dc.dc_number, dc.dc_date, dc.po_number, dc.consignee_name, dc.created_at,
               (SELECT COUNT(*) FROM gst_invoice_dc_links WHERE dc_number = dc.dc_number) as is_linked
        FROM delivery_challans dc
    """
    params = []
    
    if po:
        query += " WHERE dc.po_number = ?"
        params.append(po)
        
    query += " ORDER BY dc.created_at DESC"
    
    rows = db.execute(query, params).fetchall()
    
    results = []
    for row in rows:
        dc_num = row["dc_number"]
        
        # Calculate Value based on items * po_rate
        value_row = db.execute("""
            SELECT SUM(dci.dispatch_qty * poi.po_rate) as total_val
            FROM delivery_challan_items dci
            JOIN purchase_order_items poi ON dci.po_item_id = poi.id
            WHERE dci.dc_number = ?
        """, (dc_num,)).fetchone()
        
        total_value = value_row["total_val"] if value_row and value_row["total_val"] else 0.0
        
        # Determine Status
        status = "Delivered" if row["is_linked"] > 0 else "Pending"
        
        results.append(DCListItem(
            dc_number=row["dc_number"],
            dc_date=row["dc_date"],
            po_number=row["po_number"],
            consignee_name=row["consignee_name"],
            status=status,
            total_value=total_value,
            created_at=row["created_at"]
        ))
    
    return results


@router.get("/{dc_number}")
def get_dc_detail(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
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
            dci.dispatch_qty,
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
def create_dc(dc: DCCreate, items: List[dict], db: sqlite3.Connection = Depends(get_db)):
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
    
    # ========== VALIDATION ==========
    
    # 1. Validate DC header
    if not dc.dc_number or dc.dc_number.strip() == "":
        raise bad_request("DC number is required")
    
    if not dc.dc_date or dc.dc_date.strip() == "":
        raise bad_request("DC date is required")
    
    # 2. Validate items array
    if not items or len(items) == 0:
        raise bad_request("At least one item is required")
    
    logger.debug(f"Creating DC {dc.dc_number} with {len(items)} items")
    
    # 3. Validate each item
    for idx, item in enumerate(items):
        if "po_item_id" not in item or not item["po_item_id"]:
            raise bad_request(f"Item {idx + 1}: po_item_id is required")
        
        if "dispatch_qty" not in item or item["dispatch_qty"] is None:
            raise bad_request(f"Item {idx + 1}: dispatch_qty is required")
        
        if item["dispatch_qty"] <= 0:
            raise bad_request(f"Item {idx + 1}: dispatch_qty must be greater than 0")
        
        # 4. Check remaining quantity (prevent over-dispatch)
        po_item_id = item["po_item_id"]
        lot_no = item.get("lot_no")
        dispatch_qty = item["dispatch_qty"]
        
        # Get ordered quantity
        if lot_no:
            # Lot-wise check
            lot_row = db.execute("""
                SELECT dely_qty 
                FROM purchase_order_deliveries 
                WHERE po_item_id = ? AND lot_no = ?
            """, (po_item_id, lot_no)).fetchone()
            
            if not lot_row:
                raise bad_request(f"Item {idx + 1}: Lot {lot_no} not found for this PO item")
            
            ordered_qty = lot_row["dely_qty"]
            
            # Get already dispatched for this lot
            already_dispatched = db.execute("""
                SELECT COALESCE(SUM(dci.dispatch_qty), 0) as total
                FROM delivery_challan_items dci
                WHERE dci.po_item_id = ? AND dci.lot_no = ?
            """, (po_item_id, lot_no)).fetchone()["total"]
        else:
            # Item-level check (no lot)
            item_row = db.execute("""
                SELECT ord_qty 
                FROM purchase_order_items 
                WHERE id = ?
            """, (po_item_id,)).fetchone()
            
            if not item_row:
                raise bad_request(f"Item {idx + 1}: PO item not found")
            
            ordered_qty = item_row["ord_qty"]
            
            # Get already dispatched for this item
            already_dispatched = db.execute("""
                SELECT COALESCE(SUM(dci.dispatch_qty), 0) as total
                FROM delivery_challan_items dci
                WHERE dci.po_item_id = ?
            """, (po_item_id,)).fetchone()["total"]
        
        remaining_qty = ordered_qty - already_dispatched
        
        logger.debug(f"Item {idx + 1}: Ordered={ordered_qty}, Dispatched={already_dispatched}, Remaining={remaining_qty}, Requested={dispatch_qty}")
        
        if dispatch_qty > remaining_qty:
            raise bad_request(
                f"Item {idx + 1}: Dispatch quantity ({dispatch_qty}) exceeds remaining quantity ({remaining_qty})"
            )
    
    # ========== INSERT ==========
    
    try:
        with db_transaction(db):
            # Insert DC header
            db.execute("""
                INSERT INTO delivery_challans
                (dc_number, dc_date, po_number, department_no, consignee_name, consignee_gstin,
                 consignee_address, inspection_company, eway_bill_no, vehicle_no, lr_no,
                 transporter, mode_of_transport, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dc.dc_number, dc.dc_date, dc.po_number, dc.department_no, dc.consignee_name,
                dc.consignee_gstin, dc.consignee_address, dc.inspection_company, dc.eway_bill_no,
                dc.vehicle_no, dc.lr_no, dc.transporter, dc.mode_of_transport, dc.remarks
            ))
            
            # Insert DC items
            for item in items:
                item_id = str(uuid.uuid4())
                db.execute("""
                    INSERT INTO delivery_challan_items
                    (id, dc_number, po_item_id, lot_no, dispatch_qty, hsn_code, hsn_rate)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    item_id,
                    dc.dc_number,
                    item["po_item_id"],
                    item.get("lot_no"),
                    item["dispatch_qty"],
                    item.get("hsn_code"),
                    item.get("hsn_rate")
                ))
            
            logger.info(f"Successfully created DC {dc.dc_number} with {len(items)} items")
            return {"success": True, "dc_number": dc.dc_number}
            
    except sqlite3.IntegrityError as e:
        logger.error(f"DC creation failed due to integrity error: {e}")
        raise bad_request(f"DC creation failed: {str(e)}")


@router.get("/{dc_number}/invoice")
def check_dc_has_invoice(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Check if DC has an associated GST Invoice"""
    try:
        invoice_row = db.execute("""
            SELECT invoice_number FROM gst_invoice_dc_links 
            WHERE dc_number = ? 
            LIMIT 1
        """, (dc_number,)).fetchone()
        
        if invoice_row:
            return {
                "has_invoice": True,
                "invoice_number": invoice_row["invoice_number"]
            }
        else:
            return {"has_invoice": False}
    except Exception as e:
        logger.warning(f"Error checking invoice for DC {dc_number}: {e}")
        return {"has_invoice": False}


@router.put("/{dc_number}")
def update_dc(dc_number: str, dc: DCCreate, items: List[dict], db: sqlite3.Connection = Depends(get_db)):
    """Update existing Delivery Challan - BLOCKED if invoice exists"""
    
    # Check if DC has invoice
    invoice_check = check_dc_has_invoice(dc_number, db)
    if invoice_check["has_invoice"]:
        raise forbidden(
            f"Cannot edit DC {dc_number} - already linked to invoice {invoice_check['invoice_number']}",
            reason="DC has associated invoice"
        )
    
    # Ensure DC number matches path
    if dc.dc_number != dc_number:
        raise bad_request("DC number in body must match URL")

    # Validate items
    if not items or len(items) == 0:
        raise bad_request("At least one item is required")

    for idx, item in enumerate(items):
        if "po_item_id" not in item or not item["po_item_id"]:
             raise bad_request(f"Item {idx + 1}: po_item_id is required")
        
        if "dispatch_qty" not in item or item["dispatch_qty"] is None:
             raise bad_request(f"Item {idx + 1}: dispatch_qty is required")
             
        if item["dispatch_qty"] <= 0:
             raise bad_request(f"Item {idx + 1}: dispatch_qty must be greater than 0")

        # Check remaining quantity (excluding current DC's dispatch)
        po_item_id = item["po_item_id"]
        lot_no = item.get("lot_no")
        dispatch_qty = item["dispatch_qty"]
        
        if lot_no:
             # Lot-wise check
             lot_row = db.execute("SELECT dely_qty FROM purchase_order_deliveries WHERE po_item_id = ? AND lot_no = ?", (po_item_id, lot_no)).fetchone()
             if not lot_row: raise bad_request(f"Item {idx+1}: Lot not found")
             ordered_qty = lot_row["dely_qty"]
             
             already_dispatched = db.execute("""
                SELECT COALESCE(SUM(dispatch_qty), 0) FROM delivery_challan_items 
                WHERE po_item_id = ? AND lot_no = ? AND dc_number != ?
             """, (po_item_id, lot_no, dc_number)).fetchone()[0]
        else:
             # Item-level check
             item_row = db.execute("SELECT ord_qty FROM purchase_order_items WHERE id = ?", (po_item_id,)).fetchone()
             if not item_row: raise bad_request(f"Item {idx+1}: Item not found")
             ordered_qty = item_row["ord_qty"]
             
             already_dispatched = db.execute("""
                SELECT COALESCE(SUM(dispatch_qty), 0) FROM delivery_challan_items 
                WHERE po_item_id = ? AND dc_number != ?
             """, (po_item_id, dc_number)).fetchone()[0]
             
        remaining = ordered_qty - already_dispatched
        
        if dispatch_qty > remaining:
             raise bad_request(f"Item {idx+1}: Dispatch qty {dispatch_qty} exceeds remaining {remaining}")

    # Access DB for update
    try:
        with db_transaction(db):
            # Update Header
             db.execute("""
                UPDATE delivery_challans SET
                dc_date = ?, po_number = ?, department_no = ?, consignee_name = ?, consignee_gstin = ?,
                consignee_address = ?, inspection_company = ?, eway_bill_no = ?, vehicle_no = ?, lr_no = ?,
                transporter = ?, mode_of_transport = ?, remarks = ?
                WHERE dc_number = ?
             """, (
                dc.dc_date, dc.po_number, dc.department_no, dc.consignee_name,
                dc.consignee_gstin, dc.consignee_address, dc.inspection_company, dc.eway_bill_no,
                dc.vehicle_no, dc.lr_no, dc.transporter, dc.mode_of_transport, dc.remarks, dc_number
             ))
             
             # Delete old items
             db.execute("DELETE FROM delivery_challan_items WHERE dc_number = ?", (dc_number,))
             
             # Insert new items
             for item in items:
                item_id = str(uuid.uuid4())
                db.execute("""
                    INSERT INTO delivery_challan_items
                    (id, dc_number, po_item_id, lot_no, dispatch_qty, hsn_code, hsn_rate)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    item_id, dc_number, item["po_item_id"], item.get("lot_no"),
                    item["dispatch_qty"], item.get("hsn_code"), item.get("hsn_rate")
                ))
        
        logger.info(f"Successfully updated DC {dc_number}")
        return {"success": True, "dc_number": dc_number}
    except Exception as e:
        logger.error(f"Update failed: {e}")
        raise bad_request(f"Update failed: {e}")

