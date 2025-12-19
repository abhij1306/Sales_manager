"""
Reconciliation Router - Quantity Tracking
"""
from fastapi import APIRouter, Depends
from app.db import get_db
from app.errors import not_found
from typing import Optional
import sqlite3
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/po/{po_number}")
def reconcile_po(po_number: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Get reconciliation data for a PO
    Shows ordered vs dispatched vs pending for each item
    """
    
    items = db.execute("""
        SELECT 
            poi.id,
            poi.po_item_no,
            poi.material_code,
            poi.material_description,
            poi.unit,
            poi.ord_qty,
            COALESCE(SUM(dci.dispatch_qty), 0) as dispatched_qty,
            MAX(0, poi.ord_qty - COALESCE(SUM(dci.dispatch_qty), 0)) as pending_qty,
            CASE
                WHEN COALESCE(SUM(dci.dispatch_qty), 0) = 0 THEN 'not_started'
                WHEN COALESCE(SUM(dci.dispatch_qty), 0) < poi.ord_qty THEN 'partial'
                WHEN COALESCE(SUM(dci.dispatch_qty), 0) = poi.ord_qty THEN 'complete'
                WHEN COALESCE(SUM(dci.dispatch_qty), 0) > poi.ord_qty THEN 'over_dispatched'
            END as status
        FROM purchase_order_items poi
        LEFT JOIN delivery_challan_items dci ON poi.id = dci.po_item_id
        WHERE poi.po_number = ?
        GROUP BY poi.id
        ORDER BY poi.po_item_no
    """, (po_number,)).fetchall()
    
    if not items:
        logger.warning(f"No items found for PO {po_number}")
        return {
            "po_number": po_number,
            "fulfillment_rate": 0,
            "total_ordered": 0,
            "total_dispatched": 0,
            "total_pending": 0,
            "items": []
        }
    
    # Calculate overall fulfillment
    total_ordered = sum(item["ord_qty"] or 0 for item in items)
    total_dispatched = sum(item["dispatched_qty"] or 0 for item in items)
    fulfillment_rate = (total_dispatched / total_ordered * 100) if total_ordered > 0 else 0
    
    logger.debug(f"PO {po_number}: Ordered={total_ordered}, Dispatched={total_dispatched}, Fulfillment={fulfillment_rate:.2f}%")
    
    return {
        "po_number": po_number,
        "fulfillment_rate": round(fulfillment_rate, 2),
        "total_ordered": total_ordered,
        "total_dispatched": total_dispatched,
        "total_pending": max(0, total_ordered - total_dispatched),
        "items": [dict(item) for item in items]
    }


@router.get("/po/{po_number}/lots")
def reconcile_po_lots(po_number: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Get lot-wise reconciliation data for a PO
    Returns breakdown by po_item_id + lot_no with remaining quantities
    """
    
    lots = db.execute("""
        SELECT 
            poi.id as po_item_id,
            pod.lot_no,
            pod.dely_qty as ordered_qty,
            COALESCE(SUM(dci.dispatch_qty), 0) as already_dispatched,
            CASE 
                WHEN (pod.dely_qty - COALESCE(SUM(dci.dispatch_qty), 0)) < 0 THEN 0
                ELSE (pod.dely_qty - COALESCE(SUM(dci.dispatch_qty), 0))
            END as remaining_qty,
            poi.material_code,
            poi.material_description,
            poi.unit,
            poi.po_rate,
            pod.dely_date,
            pod.dest_code
        FROM purchase_order_items poi
        JOIN purchase_order_deliveries pod ON poi.id = pod.po_item_id
        LEFT JOIN delivery_challan_items dci ON poi.id = dci.po_item_id AND pod.lot_no = dci.lot_no
        WHERE poi.po_number = ?
        GROUP BY poi.id, pod.lot_no
        ORDER BY poi.po_item_no, pod.lot_no
    """, (po_number,)).fetchall()
    
    if not lots:
        logger.warning(f"No lot-wise data found for PO {po_number}")
        return {
            "po_number": po_number,
            "lots": []
        }
    
    logger.debug(f"Found {len(lots)} lots for PO {po_number}")
    
    return {
        "po_number": po_number,
        "lots": [dict(lot) for lot in lots]
    }


@router.get("/item/{po_item_id}")
def reconcile_item(po_item_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Get detailed reconciliation for a specific PO item"""
    
    item = db.execute("""
        SELECT 
            poi.*,
            po.po_number,
            po.supplier_name
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.po_number = po.po_number
        WHERE poi.id = ?
    """, (po_item_id,)).fetchone()
    
    if not item:
        raise not_found(f"PO item {po_item_id} not found", "PO Item")
    
    # Get dispatch history
    dispatches = db.execute("""
        SELECT 
            dc.dc_number,
            dc.dc_date,
            dci.dispatch_qty,
            dci.lot_no
        FROM delivery_challan_items dci
        JOIN delivery_challans dc ON dci.dc_number = dc.dc_number
        WHERE dci.po_item_id = ?
        ORDER BY dc.dc_date
    """, (po_item_id,)).fetchall()
    
    total_dispatched = sum(d["dispatch_qty"] or 0 for d in dispatches)
    
    return {
        "item": dict(item),
        "ordered_qty": item["ord_qty"],
        "dispatched_qty": total_dispatched,
        "pending_qty": max(0, (item["ord_qty"] or 0) - total_dispatched),
        "dispatch_history": [dict(d) for d in dispatches]
    }

