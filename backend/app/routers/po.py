"""
Purchase Order Router
CRUD operations and HTML upload/scraping
"""
from fastapi import APIRouter, Depends, UploadFile, File
from app.db import get_db
from app.models import POListItem, PODetail, POHeader, POItem, POStats
from app.errors import not_found, bad_request, internal_error
from typing import List
import sqlite3
from bs4 import BeautifulSoup
from app.services.po_scraper import extract_po_header, extract_items
from app.services.ingest_po import POIngestionService
from app.core.auth_utils import get_current_user, TokenData

from app.services.po_service import po_service

router = APIRouter()

@router.get("/stats", response_model=POStats)
def get_po_stats(db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Get PO Page Statistics"""
    return po_service.get_stats(db)

@router.get("/", response_model=List[POListItem])
def list_pos(db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """List all Purchase Orders with quantity details"""
    # In future, filter by current_user.user_id if strict ownership is required
    return po_service.list_pos(db)

@router.get("/{po_number}", response_model=PODetail)
def get_po_detail(po_number: int, db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Get Purchase Order detail with items and deliveries"""
    return po_service.get_po_detail(db, po_number)

@router.delete("/{po_number}")
def delete_po(po_number: int, db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """
    Delete a Purchase Order.
    Safe Deletion Rule: Cannot delete if linked Delivery Challans exist.
    """
    # 1. Check for linked DCs
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM delivery_challans WHERE po_number = ?", (po_number,))
    dc_count = cursor.fetchone()[0]

    if dc_count > 0:
        raise bad_request(f"Cannot delete PO-{po_number}: {dc_count} linked Delivery Challans exist. Delete them first.")

    # 2. Check for linked SRVs
    cursor.execute("SELECT COUNT(*) FROM srv_receipts WHERE po_number = ?", (str(po_number),))
    srv_count = cursor.fetchone()[0]

    if srv_count > 0:
        raise bad_request(f"Cannot delete PO-{po_number}: {srv_count} linked SRVs exist. Delete them first.")

    try:
        # 3. Delete dependencies first (cascade manual just to be safe with SQLite)
        cursor.execute("DELETE FROM purchase_order_deliveries WHERE po_item_id IN (SELECT id FROM purchase_order_items WHERE po_number = ?)", (po_number,))
        cursor.execute("DELETE FROM purchase_order_items WHERE po_number = ?", (po_number,))

        # 4. Delete PO
        cursor.execute("DELETE FROM purchase_orders WHERE po_number = ?", (po_number,))
        db.commit()

        return {"success": True, "message": f"PO-{po_number} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise internal_error(f"Failed to delete PO: {str(e)}")


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
async def upload_po_html(file: UploadFile = File(...), db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Upload and parse PO HTML file"""
    
    if not file.filename.endswith('.html'):
        raise bad_request("Only HTML files are supported")
    
    # Read and parse HTML
    content = await file.read()
    soup = BeautifulSoup(content, "lxml")
    
    # Extract data using existing scraper logic
    po_header = extract_po_header(soup)
    po_items = extract_items(soup)
    
    if not po_header.get("PURCHASE ORDER"):
        raise bad_request("Could not extract PO number from HTML")
    
    # Ingest into database
    ingestion_service = POIngestionService()
    try:
        # DB transaction is already active via get_db dependency
        success, warnings = ingestion_service.ingest_po(db, po_header, po_items)
        return {
            "success": success,
            "po_number": po_header.get("PURCHASE ORDER"),
            "warnings": warnings
        }
    except Exception as e:
        raise internal_error(f"Failed to ingest PO: {str(e)}", e)

@router.post("/upload/batch")
async def upload_po_batch(files: List[UploadFile] = File(...), db: sqlite3.Connection = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
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
            success, warnings = ingestion_service.ingest_po(db, po_header, po_items)
            
            
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
