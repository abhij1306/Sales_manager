"""
LLM Agent for Intelligent ERP Operations
Handles voice commands and natural language queries
"""
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
import json
import logging
from app.utils.structured_logger import get_structured_logger
from app.utils.schema_generator import generate_all_schemas

logger = get_structured_logger("llm_agent")


class AgentAction(str, Enum):
    """Available agent actions"""
    CREATE_DC = "create_dc"
    CREATE_INVOICE = "create_invoice"
    QUERY_DATA = "query_data"
    EXPLAIN_ERROR = "explain_error"
    SUGGEST_ACTION = "suggest_action"


# INVARIANT: AI-2 - Intent Whitelisting
# Only these actions can be executed by AI agents
# This prevents unauthorized operations and ensures safety
ALLOWED_ACTIONS = {
    "create_dc",
    "query_pending_deliveries",
    "query_data",
    "explain_error"
}

# INVARIANT: AI-1 - No LLM calls in transactions
# LLM API calls must NEVER happen while holding a database lock
# Always: 1) Call LLM, 2) Begin transaction, 3) Execute, 4) Commit


class LLMAgent:
    """
    Intelligent agent that processes natural language commands
    and executes ERP operations
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4"):
        """
        Initialize LLM agent
        
        Args:
            api_key: OpenAI API key
            model: Model to use (gpt-4, gpt-3.5-turbo, etc.)
        """
        self.api_key = api_key
        self.model = model
        self.schemas = generate_all_schemas()
        self.function_registry: Dict[str, Callable] = {}
        
        logger.info("LLM Agent initialized", model=model)
    
    def register_function(self, name: str, handler: Callable):
        """
        Register a function that the LLM can call
        
        Args:
            name: Function name (matches schema)
            handler: Python function to execute
        """
        self.function_registry[name] = handler
        logger.info(f"Registered function: {name}")
    
    async def process_voice_command(
        self,
        transcript: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a voice command and execute appropriate action
        
        Args:
            transcript: Voice command text
            context: Additional context (user_id, current_page, etc.)
        
        Returns:
            Response with action taken and result
        """
        logger.log_business_event(
            event_type="VOICE_COMMAND_RECEIVED",
            entity_type="voice_input",
            entity_id=transcript[:50],
            details={"context": context}
        )
        
        try:
            # Call LLM to determine intent and extract parameters
            response = await self._call_llm(transcript, context)
            
            # Execute the determined action
            result = await self._execute_action(response)
            
            logger.log_business_event(
                event_type="VOICE_COMMAND_EXECUTED",
                entity_type="voice_output",
                entity_id=result.get("action", "unknown"),
                details=result
            )
            
            return result
            
        except Exception as e:
            logger.error("Voice command processing failed", error=e, transcript=transcript)
            return {
                "success": False,
                "error": str(e),
                "suggestion": "Please try rephrasing your command"
            }
    
    async def _call_llm(
        self,
        user_input: str,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Call LLM with function calling
        
        This is a placeholder - integrate with actual OpenAI API
        """
        # TODO: Integrate with OpenAI API
        # For now, return mock response
        
        system_prompt = """
        You are an intelligent ERP assistant for a sales management system.
        You can help users:
        - Create delivery challans (DC)
        - Create invoices
        - Query data about POs, DCs, and invoices
        - Explain errors and suggest solutions
        
        Use the provided function schemas to execute actions.
        Always validate data before creating records.
        """
        
        # Mock response structure
        return {
            "function_call": {
                "name": "create_dc",
                "arguments": {
                    "po_number": 12345,
                    "items": []
                }
            }
        }
    
    async def _execute_action(self, llm_response: Dict) -> Dict[str, Any]:
        """
        Execute the action determined by LLM
        INVARIANT: AI-2 - Intent whitelisting enforced here
        """
        if "function_call" not in llm_response:
            return {
                "success": False,
                "error": "No action determined"
            }
        
        func_name = llm_response["function_call"]["name"]
        func_args = llm_response["function_call"]["arguments"]
        
        # SAFETY CHECK: Verify function is in whitelist
        if func_name not in ALLOWED_ACTIONS:
            logger.log_business_event(
                event_type="AI_SAFETY_VIOLATION",
                entity_type="llm_agent",
                entity_id=func_name,
                details={
                    "reason": "Function not in whitelist",
                    "attempted_function": func_name,
                    "allowed_functions": list(ALLOWED_ACTIONS)
                }
            )
            return {
                "success": False,
                "error": f"Action '{func_name}' is not permitted for safety reasons",
                "allowed_actions": list(ALLOWED_ACTIONS),
                "safety_violation": True
            }
        
        if func_name not in self.function_registry:
            return {
                "success": False,
                "error": f"Function {func_name} not registered"
            }
        
        # Execute the registered function
        # INVARIANT: AI-3 - All AI-generated parameters pass same validation as human input
        handler = self.function_registry[func_name]
        result = await handler(**func_args)
        
        return {
            "success": True,
            "action": func_name,
            "result": result
        }
    
    def explain_error(self, error_message: str, context: Optional[Dict] = None) -> str:
        """
        Use LLM to explain an error in user-friendly language
        
        Args:
            error_message: Technical error message
            context: Additional context
        
        Returns:
            User-friendly explanation
        """
        # TODO: Integrate with LLM
        # For now, return enhanced error message
        
        error_explanations = {
            "409": "This operation conflicts with existing data. ",
            "400": "The data you provided is invalid. ",
            "404": "The requested item was not found. ",
            "500": "An unexpected error occurred. "
        }
        
        for code, explanation in error_explanations.items():
            if code in error_message:
                return explanation + error_message
        
        return error_message


# Example usage functions that would be registered

async def create_dc_from_voice(
    po_number: int,
    items: List[Dict],
    dc_number: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create DC from voice command
    This would be registered with the agent
    
    INVARIANT: AI-1 - LLM call happens BEFORE transaction
    INVARIANT: AI-3 - Uses same service layer as HTTP routers
    """
    from app.services.dc import create_dc
    from app.models import DCCreate
    from app.db import get_db
    from datetime import datetime
    
    # NOTE: LLM call already completed before this function is called
    # This ensures we never call LLM inside a transaction (AI-1)
    
    # Auto-generate DC number if not provided
    if not dc_number:
        dc_number = f"DC-{datetime.now().strftime('%Y%m%d')}-{po_number}"
    
    dc = DCCreate(
        dc_number=dc_number,
        dc_date=datetime.now().strftime("%Y-%m-%d"),
        po_number=po_number
    )
    
    # Use service layer to create DC (same validation as HTTP)
    db = next(get_db())
    try:
        # Transaction starts AFTER LLM processing
        db.execute("BEGIN IMMEDIATE")
        result = create_dc(dc, items, db)
        db.commit()
        
        # Extract data from ServiceResult
        if result.success:
            return result.data
        else:
            return {
                "success": False,
                "error": result.message
            }
    except Exception as e:
        db.rollback()
        raise


async def query_pending_deliveries(
    month: Optional[int] = None,
    year: Optional[int] = None
) -> Dict[str, Any]:
    """
    Query pending deliveries
    This would be registered with the agent
    """
    from app.db import get_db
    from datetime import datetime
    
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year
    
    db = next(get_db())
    
    # Query pending DCs (not linked to invoice)
    rows = db.execute("""
        SELECT dc.dc_number, dc.dc_date, dc.po_number,
               SUM(dci.dispatch_qty * poi.po_rate) as total_value
        FROM delivery_challans dc
        LEFT JOIN delivery_challan_items dci ON dc.dc_number = dci.dc_number
        LEFT JOIN purchase_order_items poi ON dci.po_item_id = poi.id
        LEFT JOIN gst_invoice_dc_links link ON dc.dc_number = link.dc_number
        WHERE link.dc_number IS NULL
          AND strftime('%m', dc.dc_date) = ?
          AND strftime('%Y', dc.dc_date) = ?
        GROUP BY dc.dc_number
    """, (f"{month:02d}", str(year))).fetchall()
    
    total_value = sum(row["total_value"] or 0 for row in rows)
    
    return {
        "count": len(rows),
        "total_value": total_value,
        "deliveries": [dict(row) for row in rows]
    }
