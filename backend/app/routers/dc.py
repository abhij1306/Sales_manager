"""
Delivery Challan Router
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.models import DCListItem, DCCreate
from typing import List, Optional
import sqlite3
import uuid

router = APIRouter()

@router.get("/", response_model=List[DCListItem])
def list_dcs(po: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    """List all Delivery Challans, optionally filtered by PO"""
    
    if po:
        rows = db.execute("""
            SELECT dc_number, dc_date, po_number, consignee_name, created_at
            FROM delivery_challans
            WHERE po_number = ?
            ORDER BY created_at DESC
        """, (po,)).fetchall()
    else:
        rows = db.execute("""
            SELECT dc_number, dc_date, po_number, consignee_name, created_at
            FROM delivery_challans
            ORDER BY created_at DESC
        """).fetchall()
    
    return [DCListItem(**dict(row)) for row in rows]

@router.get("/{dc_number}")
def get_dc_detail(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Get Delivery Challan detail with items"""
    
    # Get DC header
    dc_row = db.execute("""
        SELECT * FROM delivery_challans WHERE dc_number = ?
    """, (dc_number,)).fetchone()
    
    if not dc_row:
        raise HTTPException(status_code=404, detail="DC not found")
    
    # Get DC items with PO item details
    items = db.execute("""
        SELECT 
            dci.id,
            dci.dispatch_qty,
            dci.hsn_code,
            dci.hsn_rate,
            poi.po_item_no,
            poi.material_code,
            poi.material_description,
            poi.unit,
            poi.po_rate
        FROM delivery_challan_items dci
        JOIN purchase_order_items poi ON dci.po_item_id = poi.id
        WHERE dci.dc_number = ?
    """, (dc_number,)).fetchall()
    
    return {
        "header": dict(dc_row),
        "items": [dict(item) for item in items]
    }

@router.post("/")
def create_dc(dc: DCCreate, items: List[dict], db: sqlite3.Connection = Depends(get_db)):
    """
    Create new Delivery Challan with items
    items format: [{"po_item_id": "uuid", "dispatch_qty": 10, "hsn_code": "7326", "hsn_rate": 18}]
    """
    
    try:
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
                (id, dc_number, po_item_id, dispatch_qty, hsn_code, hsn_rate)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                item_id,
                dc.dc_number,
                item["po_item_id"],
                item["dispatch_qty"],
                item.get("hsn_code"),
                item.get("hsn_rate")
            ))
        
        db.commit()
        return {"success": True, "dc_number": dc.dc_number}
    except sqlite3.IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"DC creation failed: {str(e)}")


@router.get("/{dc_id}/invoice")
def check_dc_has_invoice(dc_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Check if DC has an associated GST Invoice"""
    try:
        invoice_row = db.execute("""
            SELECT id, invoice_number FROM gst_invoices 
            WHERE dc_id = ? 
            LIMIT 1
        """, (dc_id,)).fetchone()
        
        if invoice_row:
            return {
                "has_invoice": True,
                "invoice_id": invoice_row["id"],
                "invoice_number": invoice_row["invoice_number"]
            }
        else:
            return {"has_invoice": False}
    except Exception as e:
        # Table might not exist yet
        return {"has_invoice": False}
