"""
Dashboard Router
Summary statistics and recent activity
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.models import DashboardSummary
import sqlite3
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: sqlite3.Connection = Depends(get_db)):
    """Get dashboard summary statistics"""
    try:
        # 1. Total Sales (Month)
        # Using active invoices. Try to filter by current month if created_at is standard.
        current_month = datetime.now().strftime('%Y-%m')
        sales_row = db.execute("""
            SELECT SUM(total_invoice_value) FROM gst_invoices 
            WHERE strftime('%Y-%m', created_at) = ?
        """, (current_month,)).fetchone()
        total_sales = sales_row[0] if sales_row and sales_row[0] else 0.0

        # 2. Pending POs
        pending_pos = db.execute("SELECT COUNT(*) FROM purchase_orders WHERE po_status = 'New' OR po_status IS NULL").fetchone()[0]
        
        # 3. New POs Today
        current_date = datetime.now().strftime('%Y-%m-%d')
        new_pos_today = db.execute("""
            SELECT COUNT(*) FROM purchase_orders 
            WHERE date(created_at) = ?
        """, (current_date,)).fetchone()[0]

        # 4. Active Challans
        active_challans = db.execute("SELECT COUNT(*) FROM delivery_challans").fetchone()[0]

        # 5. Total PO Value (All Time)
        value_row = db.execute("SELECT SUM(po_value) FROM purchase_orders").fetchone()
        total_po_value = value_row[0] if value_row and value_row[0] else 0.0

        return {
            "total_sales_month": total_sales,
            "sales_growth": 0.0, # Placeholder until historical data is sufficient for calculation
            "pending_pos": pending_pos,
            "new_pos_today": new_pos_today,
            "active_challans": active_challans,
            "active_challans_growth": "Stable", # Placeholder
            "total_po_value": total_po_value,
            "po_value_growth": 0.0 # Placeholder
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity")
def get_recent_activity(limit: int = 10, db: sqlite3.Connection = Depends(get_db)) -> List[Dict[str, Any]]:
    """Get recent activity (POs, DCs, Invoices)"""
    try:
        activities = []

        # Recent POs
        po_rows = db.execute("""
            SELECT 'PO' as type, po_number as number, po_date as date, supplier_name as party, po_value as amount, 
                   COALESCE(po_status, 'New') as status, created_at
            FROM purchase_orders 
            ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        for row in po_rows:
            activities.append(dict(row))

        # Recent Invoices
        inv_rows = db.execute("""
            SELECT 'Invoice' as type, invoice_number as number, invoice_date as date, customer_gstin as party, 
                   total_invoice_value as amount, 'Paid' as status, created_at
            FROM gst_invoices
            ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        for row in inv_rows:
            # Clean up party name if possible or keep generic
            r = dict(row)
            r['party'] = r['party'] or "Client" 
            activities.append(r)

        # Recent DCs
        dc_rows = db.execute("""
            SELECT 'DC' as type, dc_number as number, dc_date as date, consignee_name as party, 
                   0 as amount, 'Dispatched' as status, created_at
            FROM delivery_challans
            ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        for row in dc_rows:
             activities.append(dict(row))

        # Sort combined list by created_at desc
        # Note: created_at might be null for scraped data, fallback to date
        def sort_key(x):
            return x['created_at'] or x['date'] or ''
            
        activities.sort(key=sort_key, reverse=True)

        return activities[:limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
