"""
Reference Resolver - Handles deictic references (context-aware nouns)
Example: "Update *this*", "Show *that* order"
"""
from typing import Dict, Any, Optional

def resolve_references(message: str, ui_context: Optional[Dict[str, Any]]) -> str:
    """
    Resolve deictic references in the user message based on UI context.
    
    Args:
        message: The user's raw voice message
        ui_context: Dictionary containing current_page, active_entity_id, etc.
        
    Returns:
        The message with resolved references (e.g., "Update this" -> "Update PO-123")
    """
    if not isinstance(ui_context, dict):
        return message
        
    resolved = message
    message_lower = message.lower()
    
    # 1. "THIS" - refers to the currently active entity
    if "this" in message_lower and ui_context.get("active_entity_id"):
        entity_id = ui_context["active_entity_id"]
        # Simple replacement - could be smarter with NLP tokens but regex is fast and robust enough
        resolved = resolved.replace("this", entity_id)
        # Also handle "current"
        resolved = resolved.replace("current", entity_id)

    # 2. "THAT" - refers to contextually visible or last mentioned item
    # For now, if user says "that", we default to first visible item if "this" didn't match
    if "that" in message_lower and not ui_context.get("active_entity_id"):
        visible_ids = ui_context.get("visible_ids", [])
        if visible_ids and len(visible_ids) > 0:
            resolved = resolved.replace("that", visible_ids[0])

    # 3. Page context injection
    # If user says "Create new", and we are on "PO Detail", implies "Create new [something related to PO]"
    # This might be better handled by LLM, but we can hint.
    
    return resolved

def extract_entities(message: str) -> Dict[str, Any]:
    """
    Extract basic entities like PO numbers, DC numbers using regex
    Helper to update context before LLM
    """
    import re
    entities = {}
    
    # PO Pattern: PO-xxxxx or just 5 digits
    po_match = re.search(r'\b(PO-?\s?)?(\d{5})\b', message, re.IGNORECASE)
    if po_match:
        entities["po_number"] = f"PO-{po_match.group(2)}"
        
    # DC Pattern: DC-xxx or just 3-4 digits
    dc_match = re.search(r'\b(DC-?\s?)?(\d{3,4})\b', message, re.IGNORECASE)
    if dc_match:
        entities["dc_number"] = f"DC-{dc_match.group(2)}"
        
    return entities
