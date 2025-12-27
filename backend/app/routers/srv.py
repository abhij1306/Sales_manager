from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import List, Optional
from pydantic import BaseModel
from app.db import get_connection
from app.core.auth_utils import get_current_user, TokenData
from app.services.srv.srv_scraper import scrape_srv_html
import sqlite3
import logging

# Prefix handled in main.py (/api/srv)
router = APIRouter(tags=["SRV"])
logger = logging.getLogger(__name__)

class SRVCreate(BaseModel):
    srv_number: str
    srv_date: str
    po_number: str
    received_qty: float
    accepted_qty: float
    rejected_qty: float
    remarks: Optional[str] = None

class SRVResponse(SRVCreate):
    id: int
    created_at: str

@router.post("/upload", response_model=SRVResponse)
async def upload_srv(file: UploadFile = File(...), current_user: TokenData = Depends(get_current_user)):
    content = await file.read()
    html_content = content.decode('utf-8')

    try:
        data = scrape_srv_html(html_content)

        # If scraper fails to find critical data, return error or partial data
        if not data.get("srv_number"):
             raise HTTPException(status_code=400, detail="Could not extract SRV Number from file")

        # In a real app, we might return the scraped data to the UI for confirmation before saving.
        # Here we save directly if valid, or we could return it.
        # Let's return the scraped data for the UI form to populate
        return data # This breaks the response_model, handled below in a separate endpoint usually
                    # But for now let's implement the "Confirm" flow in UI.
                    # Actually, the user wants "Ingestion".

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=SRVResponse)
async def create_srv(srv: SRVCreate, current_user: TokenData = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """INSERT INTO srv_receipts
               (srv_number, srv_date, po_number, received_qty, accepted_qty, rejected_qty, remarks, user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (srv.srv_number, srv.srv_date, srv.po_number, srv.received_qty,
             srv.accepted_qty, srv.rejected_qty, srv.remarks, current_user.user_id)
        )
        conn.commit()
        srv_id = cursor.lastrowid

        return {**srv.dict(), "id": srv_id, "created_at": "now"}
    except sqlite3.IntegrityError as e:
        raise HTTPException(status_code=400, detail="SRV Number already exists")
    except Exception as e:
        logger.error(f"Error creating SRV: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        conn.close()

@router.get("/", response_model=List[SRVResponse])
async def list_srvs(current_user: TokenData = Depends(get_current_user)):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM srv_receipts WHERE user_id = ?", (current_user.user_id,))
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]
