"""
Verification Service - "Dry Run" Logic for Safe CRUD Operations
"""
import logging
import sqlite3
from typing import Dict, List, Any, Optional, Tuple
from difflib import get_close_matches

logger = logging.getLogger(__name__)

from app.db import DATABASE_PATH

logger = logging.getLogger(__name__)

class VerificationService:
    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(DATABASE_PATH)

    def _get_db(self):
        return sqlite3.connect(self.db_path)

    async def verify_create_dc(self, po_number: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Verify DC creation request against PO data.
        
        Args:
            po_number: "PO-12345"
            items: [{"description": "Widget A", "quantity": 100}]
            
        Returns:
            {
                "valid": bool,
                "summary": str,
                "warnings": List[str],
                "data": { ... } # Validated data ready for execution
            }
        """
        valid = True
        warnings = []
        verified_items = []
        
        with self._get_db() as conn:
            conn.row_factory = sqlite3.Row
            
            # 1. Verify PO exists
            po_row = conn.execute(
                "SELECT * FROM purchase_orders WHERE po_number = ?", 
                (po_number,)
            ).fetchone()
            
            if not po_row:
                return {
                    "valid": False,
                    "summary": f"PO {po_number} not found",
                    "warnings": [f"Purchase Order {po_number} does not exist"],
                    "data": None
                }
            
            # 2. Fetch PO Items with remaining quantities
            po_items_rows = conn.execute("""
                SELECT id, material_description, ord_qty
                FROM purchase_order_items
                WHERE po_number = ?
            """, (po_number,)).fetchall()
            
            po_items_map = {} # normalized desc -> item
            for row in po_items_rows:
                # Calculate remaining qty (naive implementation, should use DC sum)
                # For now using total ordered as upper bound, or fetching delivery status
                item_id = row["id"]
                desc = row["material_description"]
                
                # Fetch delivery status (already dispatched)
                dispatched_row = conn.execute("""
                    SELECT COALESCE(SUM(dispatch_qty), 0)
                    FROM delivery_challan_items
                    WHERE po_item_id = ?
                """, (item_id,)).fetchone()
                dispatched = dispatched_row[0] if dispatched_row else 0
                
                remaining = row["ord_qty"] - dispatched
                po_items_map[desc.lower()] = {
                    "id": item_id,
                    "description": desc,
                    "remaining": remaining,
                    "original": row
                }

            # 3. Match requested items to PO items
            for item in items:
                req_desc = item.get("description", "").strip().lower()
                req_qty = float(item.get("quantity", 0))
                
                if not req_desc:
                    warnings.append("Item missing description skipped")
                    continue
                
                # Fuzzy match description
                match = None
                if req_desc in po_items_map:
                    match = po_items_map[req_desc]
                else:
                    # Try finding closest match
                    candidates = list(po_items_map.keys())
                    matches = get_close_matches(req_desc, candidates, n=1, cutoff=0.6)
                    if matches:
                        match = po_items_map[matches[0]]
                        warnings.append(f"matched '{item['description']}' to '{match['description']}'")
                
                if not match:
                    warnings.append(f"Item '{item['description']}' not found in PO")
                    valid = False # Cannot proceed if item not found
                    continue
                
                # Check quantity
                if req_qty > match["remaining"]:
                    warnings.append(
                        f"Requested {req_qty} for '{match['description']}', "
                        f"but only {match['remaining']} remaining"
                    )
                    # We allow it (soft warning) or block it? 
                    # Usually blocking is safer, but let's allow confirmation with warning
                    # Actually, validate_dc_items in dc.py BLOCKS it. 
                    # So we should warn strongly that it WILL fail.
                    valid = False 
                
                verified_items.append({
                    "po_item_id": match["id"],
                    "description": match["description"],
                    "dispatch_qty": req_qty,
                    # Lot no logic is complex, skipping for fuzzy voice matching for now
                    # or assuming first lot? 
                    # If PO uses lots, we need lot info.
                    # For V1, assume simple POs or user will fix in UI form.
                })

        # Construct summary
        item_count = len(verified_items)
        total_units = sum(i["dispatch_qty"] for i in verified_items)
        summary = f"Create DC for {po_number} with {item_count} items ({total_units} units)"
        
        return {
            "valid": valid,
            "summary": summary,
            "warnings": warnings,
            "data": {
                "po_number": po_number,
                "items": verified_items
            }
        }
