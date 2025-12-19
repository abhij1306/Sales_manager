"""
Voice/LLM API Endpoint
Handles voice commands and natural language queries
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.llm_agent import LLMAgent, create_dc_from_voice, query_pending_deliveries
from app.utils.structured_logger import get_structured_logger
import os

router = APIRouter()
logger = get_structured_logger("voice_api")

# Initialize LLM agent (in production, use dependency injection)
# Get API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
agent = LLMAgent(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Register available functions
if agent:
    agent.register_function("create_dc", create_dc_from_voice)
    agent.register_function("query_pending_deliveries", query_pending_deliveries)


class VoiceCommandRequest(BaseModel):
    """Voice command request"""
    transcript: str
    context: Optional[Dict[str, Any]] = None


class VoiceCommandResponse(BaseModel):
    """Voice command response"""
    success: bool
    action: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    suggestion: Optional[str] = None
    response_text: str


@router.post("/voice/command", response_model=VoiceCommandResponse)
async def process_voice_command(request: VoiceCommandRequest):
    """
    Process a voice command using LLM
    
    Example commands:
    - "Create a delivery challan for PO 12345"
    - "Show me pending deliveries for this month"
    - "What's the status of DC-2024-001?"
    """
    if not agent:
        raise HTTPException(
            status_code=503,
            detail="LLM agent not configured. Set OPENAI_API_KEY environment variable."
        )
    
    logger.log_api_call(
        endpoint="/api/voice/command",
        method="POST",
        payload={"transcript": request.transcript}
    )
    
    try:
        result = await agent.process_voice_command(
            transcript=request.transcript,
            context=request.context
        )
        
        # Generate response text
        response_text = _generate_response_text(result)
        
        return VoiceCommandResponse(
            success=result.get("success", False),
            action=result.get("action"),
            result=result.get("result"),
            error=result.get("error"),
            suggestion=result.get("suggestion"),
            response_text=response_text
        )
        
    except Exception as e:
        logger.error("Voice command processing failed", error=e)
        return VoiceCommandResponse(
            success=False,
            error=str(e),
            response_text=f"I encountered an error: {str(e)}. Please try again."
        )


@router.post("/voice/explain-error")
async def explain_error(error_message: str, context: Optional[Dict] = None):
    """
    Get user-friendly explanation of an error
    """
    if not agent:
        return {"explanation": error_message}
    
    explanation = agent.explain_error(error_message, context)
    
    return {
        "original_error": error_message,
        "explanation": explanation
    }


def _generate_response_text(result: Dict[str, Any]) -> str:
    """
    Generate natural language response from result
    """
    if not result.get("success"):
        return f"I couldn't complete that action. {result.get('error', 'Unknown error')}"
    
    action = result.get("action", "")
    data = result.get("result", {})
    
    # Generate response based on action
    if action == "create_dc":
        dc_number = data.get("dc_number", "")
        return f"I've created delivery challan {dc_number} successfully."
    
    elif action == "query_pending_deliveries":
        count = data.get("count", 0)
        total_value = data.get("total_value", 0)
        return f"You have {count} pending deliveries totaling ₹{total_value:,.2f}."
    
    else:
        return "Action completed successfully."


# Example: Integration with existing routers
@router.get("/voice/suggestions")
async def get_voice_suggestions():
    """
    Get suggested voice commands for the current context
    """
    return {
        "suggestions": [
            "Create a delivery challan for PO [number]",
            "Show pending deliveries for this month",
            "What's the status of DC [number]?",
            "Create an invoice for DC [number]",
            "Show me all invoices from last week"
        ]
    }
