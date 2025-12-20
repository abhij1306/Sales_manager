"""
Intent Classifier - Fast intent detection with regex layer
Provides instant responses for simple commands, LLM for complex queries
"""
import re
import logging
from typing import Dict, Any, Optional, Callable
from app.services.llm_client import get_llm_client

logger = logging.getLogger(__name__)

# Instant command patterns (0ms latency)
INSTANT_COMMANDS: Dict[str, Callable[[re.Match], Dict[str, Any]]] = {
    # Navigation
    r"^go to (.+)$": lambda m: {
        "type": "navigate",
        "navigate": {"page": m.group(1).replace(" ", "_")},
        "message": f"Navigating to {m.group(1)}",
        "tts_text": f"Going to {m.group(1)}"
    },
    
    # Filter management
    r"^clear filters?$": lambda _: {
        "type": "filter",
        "filter": {"entity": "current", "filters": {}},
        "message": "Filters cleared",
        "tts_text": "Filters cleared"
    },
    
    # Cancel
    r"^(stop|cancel|nevermind)$": lambda _: {
        "type": "cancel",
        "message": "Cancelled",
        "tts_text": "Cancelled"
    },
    
    # Help
    r"^(help|what can you do)$": lambda _: {
        "type": "help",
        "message": """I can help you with:
        
• Navigation: "Go to [page]"
• Search: "Find PO 12345", "Show pending DCs"
• Create: "Create DC for PO 12345"
• Filter: "Show orders from last week"
• Clear: "Clear filters"

What would you like to do?""",
        "tts_text": "I can help with navigation, search, creating documents, and filtering. What would you like to do?"
    },
}

# Intent keywords for quick classification
INTENT_KEYWORDS = {
    "navigate": ["go to", "open", "show page", "navigate"],
    "query": ["show", "find", "search", "list", "get", "what", "how many"],
    "create": ["create", "make", "generate", "new"],
    "update": ["update", "change", "modify", "edit"],
    "delete": ["delete", "remove"],
    "filter": ["filter", "from", "between", "status"],
    "calculate": ["calculate", "total", "sum", "count"],
    "compare": ["compare", "difference", "versus"],
    "explain": ["why", "explain", "what does", "what is"],
}


async def classify_intent(text: str, ui_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Classify user intent
    
    Fast path: Check regex patterns first (0ms)
    Slow path: Use LLM for complex queries (~500ms)
    
    Returns:
    {
        "intent": "navigate",
        "confidence": 0.95,
        "action": {...},  # If instant command
        "requires_llm": false
    }
    """
    
    text_lower = text.lower().strip()
    
    # 1. Check instant commands (regex)
    for pattern, handler in INSTANT_COMMANDS.items():
        match = re.match(pattern, text_lower)
        if match:
            action = handler(match)
            logger.info(
                "Instant command matched",
                extra={"pattern": pattern, "intent": action.get("type")}
            )
            return {
                "intent": action.get("type"),
                "confidence": 1.0,
                "action": action,
                "requires_llm": False
            }
    
    # 2. Quick keyword-based classification
    intent_scores = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            intent_scores[intent] = score
    
    if intent_scores:
        top_intent = max(intent_scores, key=intent_scores.get)
        confidence = intent_scores[top_intent] / len(text_lower.split())
        
        logger.info(
            "Keyword-based classification",
            extra={"intent": top_intent, "confidence": confidence}
        )
        
        return {
            "intent": top_intent,
            "confidence": min(confidence, 0.8),  # Cap at 0.8 for keyword matching
            "requires_llm": True  # Still need LLM for full processing
        }
    
    # 3. Default to LLM
    logger.info("No quick match, using LLM classification")
    return {
        "intent": "unknown",
        "confidence": 0.0,
        "requires_llm": True
    }


async def classify_with_llm(text: str, ui_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Use LLM to classify complex intents
    
    Returns structured intent with entities
    """
    
    prompt = f"""Classify the user's intent and extract entities.

User message: "{text}"

UI Context: {ui_context if ui_context else "None"}

Return JSON with:
{{
    "intent": "navigate|query|create|update|delete|filter|calculate|compare|explain",
    "confidence": 0.0-1.0,
    "entities": {{
        "po_numbers": [],
        "dc_numbers": [],
        "dates": [],
        "statuses": []
    }},
    "requires_confirmation": true/false
}}"""

    try:
        llm_client = get_llm_client()
        response = await llm_client.chat(
            messages=[{"role": "user", "content": prompt}],
            provider="groq",
            temperature=0.1,  # Strict adherence
            response_format={"type": "json_object"}
        )
        
        content = response["content"]
        # Strip markdown if present
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
            
        import json
        result = json.loads(content)
        
        logger.info(
            "LLM classification complete",
            extra={"intent": result.get("intent"), "confidence": result.get("confidence")}
        )
        
        return result
        
    except Exception as e:
        logger.error(f"LLM classification failed: {e}", exc_info=True)
        return {
            "intent": "unknown",
            "confidence": 0.0,
            "error": str(e)
        }
