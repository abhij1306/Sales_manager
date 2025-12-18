"""
PO Notes Templates Router
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.logging_config import log_business_event
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import uuid
from datetime import datetime

router = APIRouter()

class PONoteTemplate(BaseModel):
    title: str
    content: str

class PONoteTemplateResponse(BaseModel):
    id: str
    title: str
    content: str
    is_active: bool
    created_at: str
    updated_at: str

@router.get("/", response_model=List[PONoteTemplateResponse])
def list_templates(
    active_only: bool = True,
    db: sqlite3.Connection = Depends(get_db)
):
    """List all PO notes templates"""
    
    query = "SELECT * FROM po_notes_templates"
    if active_only:
        query += " WHERE is_active = 1"
    query += " ORDER BY title"
    
    rows = db.execute(query).fetchall()
    return [dict(row) for row in rows]

@router.get("/{template_id}", response_model=PONoteTemplateResponse)
def get_template(template_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Get a specific template"""
    
    row = db.execute(
        "SELECT * FROM po_notes_templates WHERE id = ?",
        (template_id,)
    ).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return dict(row)

@router.post("/", response_model=PONoteTemplateResponse)
def create_template(
    template: PONoteTemplate,
    db: sqlite3.Connection = Depends(get_db)
):
    """Create a new PO notes template"""
    
    template_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    db.execute("""
        INSERT INTO po_notes_templates (id, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    """, (template_id, template.title, template.content, now, now))
    
    db.commit()
    log_business_event("CREATE", "PO_NOTE_TEMPLATE", template_id, metadata={"title": template.title})
    
    return {
        "id": template_id,
        "title": template.title,
        "content": template.content,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

@router.put("/{template_id}", response_model=PONoteTemplateResponse)
def update_template(
    template_id: str,
    template: PONoteTemplate,
    db: sqlite3.Connection = Depends(get_db)
):
    """Update a template"""
    
    existing = db.execute(
        "SELECT * FROM po_notes_templates WHERE id = ?",
        (template_id,)
    ).fetchone()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    now = datetime.utcnow().isoformat()
    
    db.execute("""
        UPDATE po_notes_templates
        SET title = ?, content = ?, updated_at = ?
        WHERE id = ?
    """, (template.title, template.content, now, template_id))
    
    db.commit()
    log_business_event("UPDATE", "PO_NOTE_TEMPLATE", template_id)
    
    return {
        "id": template_id,
        "title": template.title,
        "content": template.content,
        "is_active": existing["is_active"],
        "created_at": existing["created_at"],
        "updated_at": now
    }

@router.delete("/{template_id}")
def delete_template(template_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Soft delete a template (set is_active = 0)"""
    
    db.execute(
        "UPDATE po_notes_templates SET is_active = 0 WHERE id = ?",
        (template_id,)
    )
    
    db.commit()
    log_business_event("DELETE", "PO_NOTE_TEMPLATE", template_id)
    
    return {"success": True}
