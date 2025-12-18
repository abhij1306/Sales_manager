"""
Dashboard Router
Summary statistics and recent activity
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
import sqlite3
from typing import List, Dict, Any

router = APIRouter()

@router.get("/dashboard/summary")
def get_dashboard_summary(db: sqlite3.Connection = Depends(get_db)):
    """Get dashboard summary statistics"""
    try:
        # Get total POs
        total_pos = db.execute("SELECT COUNT(*) as count FROM purchase_orders").fetchone()["count"]
        
        # Get total PO value
        total_value_row = db.execute("SELECT SUM(po_value) as total FROM purchase_orders").fetchone()
        total_value = total_value_row["total"] if total_value_row["total"] else 0
        
        return {
            "total_pos": total_pos,
            "total_dcs": 0,  # TODO: Implement when DC module is ready
            "total_invoices": 0,  # TODO: Implement when Invoice module is ready
            "total_po_value": float(total_value)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity")
def get_recent_activity(limit: int = 10, db: sqlite3.Connection = Depends(get_db)) -> List[Dict[str, Any]]:
    """Get recent activity (POs, DCs, Invoices)"""
    try:
        # For now, just return recent POs
        # TODO: Add DCs and Invoices when those modules are implemented
        rows = db.execute("""
            SELECT 
                po_number,
                po_date,
                supplier_name,
                po_value
            FROM purchase_orders
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,)).fetchall()
        
        return [
            {
                "type": "PO",
                "number": str(row["po_number"]),
                "date": row["po_date"] or "",
                "party": row["supplier_name"] or "",
                "value": float(row["po_value"]) if row["po_value"] else None
            }
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
