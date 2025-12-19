"""
Purchase Order Router
CRUD operations and HTML upload/scraping
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.db import get_db
from app.models import POListItem, PODetail, POHeader, POItem, POStats
from typing import List
import sqlite3
from bs4 import BeautifulSoup
from app.services.po_scraper import extract_po_header, extract_items
from app.services.ingest_po import POIngestionService

router = APIRouter()

@router.get("/stats", response_model=POStats)
def get_po_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get PO Page Statistics"""
    try:
        # Open Orders (Active)
        open_count = db.execute("SELECT COUNT(*) FROM purchase_orders WHERE po_status = 'Active'").fetchone()[0]
        
        # Pending Approval (Mock logic for now, using 'New' status)
        pending_count = db.execute("SELECT COUNT(*) FROM purchase_orders WHERE po_status = 'New' OR po_status IS NULL").fetchone()[0]
        
        # Total Value YTD (All POs for now)
        value_row = db.execute("SELECT SUM(po_value) FROM purchase_orders").fetchone()
        total_value = value_row[0] if value_row and value_row[0] else 0.0
        
        return {
            "open_orders_count": open_count,
            "pending_approval_count": pending_count,
            "total_value_ytd": total_value,
            "total_value_change": 0.0 # Placeholder
        }
    except Exception as e:
        return {
            "open_orders_count": 0, "pending_approval_count": 0, "total_value_ytd": 0.0, "total_value_change": 0
        }

@router.get("/", response_model=List[POListItem])
def list_pos(db: sqlite3.Connection = Depends(get_db)):
    """List all Purchase Orders with quantity details"""
    rows = db.execute("""
        SELECT po_number, po_date, supplier_name, po_value, amend_no, po_status, created_at
        FROM purchase_orders
        ORDER BY created_at DESC
    """).fetchall()
    
    results = []
    for row in rows:
        po_num = row['po_number']
        
        # Calculate Total Ordered Quantity
        ordered_row = db.execute("""
            SELECT SUM(ord_qty) FROM purchase_order_items WHERE po_number = ?
        """, (po_num,)).fetchone()
        total_ordered = ordered_row[0] if ordered_row and ordered_row[0] else 0.0

        # Calculate Total Dispatched Quantity
        # Link via PO Items to get specific dispatches for this PO
        dispatched_row = db.execute("""
            SELECT SUM(dci.dispatch_qty) 
            FROM delivery_challan_items dci
            JOIN purchase_order_items poi ON dci.po_item_id = poi.id
            WHERE poi.po_number = ?
        """, (po_num,)).fetchone()
        total_dispatched = dispatched_row[0] if dispatched_row and dispatched_row[0] else 0.0

        # Calculate Pending
        total_pending = max(0, total_ordered - total_dispatched)

        # Fetch linked DC numbers for reference (optional, keeping for completeness if model expects it)
        dc_rows = db.execute("SELECT dc_number FROM delivery_challans WHERE po_number = ?", (po_num,)).fetchall()
        dc_nums = [r['dc_number'] for r in dc_rows]
        linked_dcs_str = ", ".join(dc_nums) if dc_nums else None

        results.append(POListItem(
            po_number=row["po_number"],
            po_date=row["po_date"],
            supplier_name=row["supplier_name"],
            po_value=row["po_value"],
            amend_no=row["amend_no"],
            po_status=row["po_status"] or "New",
            linked_dc_numbers=linked_dcs_str,
            total_ordered_qty=total_ordered,
            total_dispatched_qty=total_dispatched,
            total_pending_qty=total_pending,
            created_at=row["created_at"]
        ))
    
    return results

@router.get("/{po_number}", response_model=PODetail)
def get_po_detail(po_number: int, db: sqlite3.Connection = Depends(get_db)):
    """Get Purchase Order detail with items and deliveries"""
    
    # Get header
    header_row = db.execute("""
        SELECT * FROM purchase_orders WHERE po_number = ?
    """, (po_number,)).fetchone()
    
    if not header_row:
        raise HTTPException(status_code=404, detail="PO not found")
    
    header = POHeader(**dict(header_row))
    
    # Get items
    item_rows = db.execute("""
        SELECT id, po_item_no, material_code, material_description, drg_no, mtrl_cat,
               unit, po_rate, ord_qty, rcd_qty, item_value, hsn_code
        FROM purchase_order_items
        WHERE po_number = ?
        ORDER BY po_item_no
    """, (po_number,)).fetchall()
    
    # For each item, get deliveries
    items_with_deliveries = []
    for item_row in item_rows:
        item_dict = dict(item_row)
        item_id = item_dict['id']
        
        # Get deliveries for this item
        delivery_rows = db.execute("""
            SELECT id, lot_no, dely_qty, dely_date, entry_allow_date, dest_code
            FROM purchase_order_deliveries
            WHERE po_item_id = ?
            ORDER BY lot_no
        """, (item_id,)).fetchall()
        
        deliveries = [dict(d) for d in delivery_rows]
        
        # Create POItem with deliveries
        item_with_deliveries = {**item_dict, 'deliveries': deliveries}
        items_with_deliveries.append(POItem(**item_with_deliveries))
    
    return PODetail(header=header, items=items_with_deliveries)


@router.get("/{po_number}/dc")
def check_po_has_dc(po_number: int, db: sqlite3.Connection = Depends(get_db)):
    """Check if PO has an associated Delivery Challan"""
    try:
        dc_row = db.execute("""
            SELECT id, dc_number FROM delivery_challans 
            WHERE po_number = ? 
            LIMIT 1
        """, (po_number,)).fetchone()
        
        if dc_row:
            return {
                "has_dc": True,
                "dc_id": dc_row["id"],
                "dc_number": dc_row["dc_number"]
            }
        else:
            return {"has_dc": False}
    except Exception as e:
        # Table might not exist yet
        return {"has_dc": False}

@router.post("/upload")
async def upload_po_html(file: UploadFile = File(...), db: sqlite3.Connection = Depends(get_db)):
    """Upload and parse PO HTML file"""
    
    if not file.filename.endswith('.html'):
        raise HTTPException(status_code=400, detail="Only HTML files are supported")
    
    # Read and parse HTML
    content = await file.read()
    soup = BeautifulSoup(content, "lxml")
    
    # Extract data using existing scraper logic
    po_header = extract_po_header(soup)
    po_items = extract_items(soup)
    
    if not po_header.get("PURCHASE ORDER"):
        raise HTTPException(status_code=400, detail="Could not extract PO number from HTML")
    
    # Ingest into database
    ingestion_service = POIngestionService()
    try:
        success, warnings = ingestion_service.ingest_po(po_header, po_items)
        return {
            "success": success,
            "po_number": po_header.get("PURCHASE ORDER"),
            "warnings": warnings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/batch")
async def upload_po_batch(files: List[UploadFile] = File(...), db: sqlite3.Connection = Depends(get_db)):
    """Upload and parse multiple PO HTML files"""
    
    results = []
    successful = 0
    failed = 0
    
    ingestion_service = POIngestionService()
    
    for file in files:
        result = {
            "filename": file.filename,
            "success": False,
            "po_number": None,
            "message": ""
        }
        
        try:
            # Validate file type
            if not file.filename.endswith('.html'):
                result["message"] = "Only HTML files are supported"
                failed += 1
                results.append(result)
                continue
            
            # Read and parse HTML
            content = await file.read()
            soup = BeautifulSoup(content, "lxml")
            
            # Extract data
            po_header = extract_po_header(soup)
            po_items = extract_items(soup)
            
            if not po_header.get("PURCHASE ORDER"):
                result["message"] = "Could not extract PO number from HTML"
                failed += 1
                results.append(result)
                continue
            
            # Ingest into database
            success, warnings = ingestion_service.ingest_po(po_header, po_items)
            
            if success:
                result["success"] = True
                result["po_number"] = po_header.get("PURCHASE ORDER")
                result["message"] = warnings[0] if warnings else f"Successfully ingested PO {po_header.get('PURCHASE ORDER')}"
                successful += 1
            else:
                result["message"] = "Failed to ingest PO"
                failed += 1
                
        except Exception as e:
            result["message"] = f"Error: {str(e)}"
            failed += 1
        
        results.append(result)
    
    return {
        "total": len(files),
        "successful": successful,
        "failed": failed,
        "results": results
    }
