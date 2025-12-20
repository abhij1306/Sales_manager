"""
Voice Agent Router - Production-grade voice interface
Supports Groq Whisper STT, streaming chat, and UI context awareness
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Body, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import json
import logging
import uuid
import os
import sqlite3
from app.db import get_db

from app.services.llm_client import get_llm_client
from app.services.context_manager import context_manager
from app.services.reference_resolver import resolve_references, extract_entities

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    """Chat request with UI context"""
    message: str
    session_id: Optional[str] = None
    ui_context: Optional[Dict[str, Any]] = None


class VoiceAgentAction(BaseModel):
    """Structured action output from voice agent"""
    type: str  # navigate, filter, fill_form, show_data, confirm, error
    navigate: Optional[Dict[str, Any]] = None
    filter: Optional[Dict[str, Any]] = None
    fill_form: Optional[Dict[str, Any]] = None
    show_data: Optional[Dict[str, Any]] = None
    confirm: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    message: str
    tts_text: Optional[str] = None


@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Convert speech to text using Groq Whisper
    
    Accepts: audio/webm, audio/wav, audio/mp3
    Returns: { "text": "transcribed text", "duration": 1.23 }
    """
    
    try:
        # Read audio file
        audio_bytes = await audio.read()
        
        # Call Groq Whisper
        llm_client = get_llm_client()
        result = await llm_client.speech_to_text(
            audio_file=audio_bytes,
            filename=audio.filename or "audio.webm"
        )
        
        logger.info(
            "STT completed",
            extra={
                "text_length": len(result["text"]),
                "duration": result["duration"]
            }
        )
        
        return result
        
    except Exception as e:
        logger.error(f"STT failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")


@router.post("/chat")
async def voice_chat(request: ChatRequest):
    """
    Process voice command with UI context
    
    Request:
    {
        "message": "Show me pending DCs",
        "session_id": "abc123",  # optional
        "ui_context": {
            "current_page": "dc_list",
            "active_entity_id": "DC-998",
            "visible_ids": ["DC-998", "DC-997"]
        }
    }
    
    Response:
    {
        "type": "filter",
        "filter": {...},
        "message": "Showing pending DCs",
        "session_id": "abc123"
    }
    """
    
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Update UI context
        if request.ui_context:
            await context_manager.update_ui_context(session_id, request.ui_context)
        
        # Resolve deictic references
        resolved_message = resolve_references(request.message, request.ui_context)
        
        # Extract entities
        entities = extract_entities(resolved_message)
        if entities:
            await context_manager.update_entities(session_id, entities)
        
        # Add user message to history
        await context_manager.add_message(session_id, "user", resolved_message)
        
        # Get conversation history
        history = await context_manager.get_messages_for_llm(session_id)
        
        # Add current message
        history.append({"role": "user", "content": resolved_message})
        

        # Determine provider
        provider = os.getenv("LLM_PROVIDER", "groq")
        
        # Call LLM
        llm_client = get_llm_client()
        response = await llm_client.chat(
            messages=history,
            provider=provider,
            temperature=0.7
        )
        
        # Parse response
        response_text = response["content"]
        
        # Add assistant message to history
        await context_manager.add_message(session_id, "assistant", response_text)
        
        # Try to parse as JSON action
        try:
            action = json.loads(response_text)
            action["session_id"] = session_id
            
            # ---------------------------------------------------------
            # SAFETY LAYER: Verify 'confirm' actions before sending to UI
            # ---------------------------------------------------------
            if action.get("type") == "confirm" and action.get("confirm", {}).get("action") == "create_dc":
                from app.services.verification import VerificationService
                verifier = VerificationService()
                
                confirm_payload = action["confirm"]
                data = confirm_payload.get("data", {})
                po_number = data.get("po_number") or extract_entities(resolved_message).get("po_number")
                items = data.get("items", [])
                
                if po_number:
                    try:
                        verification = await verifier.verify_create_dc(po_number, items)
                        
                        if not verification["valid"]:
                            # Downgrade to error/warning
                            action["type"] = "error"
                            action["message"] = f"I cannot create that DC. {verification['summary']}. Issues: {'; '.join(verification['warnings'])}"
                            action["error"] = {
                                "message": action["message"],
                                "suggestions": verification["warnings"]
                            }
                            # Remove confirm block to prevent frontend from showing confirm dialog
                            if "confirm" in action:
                                del action["confirm"]
                        else:
                            # Success! Enrich with verified data (real IDs)
                            action["confirm"]["data"] = verification["data"]
                            action["confirm"]["message"] = f"Verified: {verification['summary']}. Proceed?"
                    except Exception as ve:
                        logger.error(f"Verification crashed: {ve}", exc_info=True)
                        action["type"] = "error"
                        action["message"] = f"I had trouble verifying that request. System error: {str(ve)}"
                else:
                     # PO number missing
                     action["type"] = "error"
                     action["message"] = "I need a PO number to create a DC. Which PO is this for?"

            return action
        except json.JSONDecodeError:
            # Return as plain message
            return {
                "type": "message",
                "message": response_text,
                "session_id": session_id
            }
        
    except Exception as e:
        logger.error(f"Chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.post("/chat/stream")
async def voice_chat_stream(request: ChatRequest):
    """
    Stream voice chat responses for instant TTFB
    
    Returns Server-Sent Events (SSE) stream
    """
    
    async def generate():
        try:
            # Generate session ID if not provided
            session_id = request.session_id or str(uuid.uuid4())
            
            # Update UI context
            if request.ui_context:
                await context_manager.update_ui_context(session_id, request.ui_context)
            
            # Resolve references
            resolved_message = resolve_references(request.message, request.ui_context)
            
            # Extract entities
            entities = extract_entities(resolved_message)
            if entities:
                await context_manager.update_entities(session_id, entities)
            
            # Add user message
            await context_manager.add_message(session_id, "user", resolved_message)
            
            # Send immediate thinking status
            yield f"data: {json.dumps({'type': 'thinking', 'message': 'Processing your request...', 'session_id': session_id})}\n\n"
            
            # Get history
            history = await context_manager.get_messages_for_llm(session_id)
            history.append({"role": "user", "content": resolved_message})
            
            # Determine provider
            provider = os.getenv("LLM_PROVIDER", "groq")
            
            # Stream LLM response
            llm_client = get_llm_client()
            full_response = ""
            async for chunk in llm_client.stream(messages=history, provider=provider):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk, 'session_id': session_id})}\n\n"
            
            # Add to history
            await context_manager.add_message(session_id, "assistant", full_response)
            
            # Send completion
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/context/{session_id}")
async def get_context(session_id: str):
    """
    Get conversation context summary
    
    Returns:
    {
        "session_id": "abc123",
        "message_count": 10,
        "entities": {...},
        "current_intent": "...",
        "ui_context": {...}
    }
    """
    
    try:
        summary = await context_manager.get_context_summary(session_id)
        return summary
    except Exception as e:
        logger.error(f"Get context failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get context: {str(e)}")


@router.delete("/context/{session_id}")
async def clear_context(session_id: str):
    """Clear conversation context"""
    
    try:
        await context_manager.clear_context(session_id)
        return {"message": f"Context cleared for session {session_id}"}
    except Exception as e:
        logger.error(f"Clear context failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to clear context: {str(e)}")


@router.post("/confirm/{action}")
async def confirm_action(action: str, data: Dict[str, Any] = Body(...), db: sqlite3.Connection = Depends(get_db)):
    """
    Execute confirmed action
    
    Only called after user confirms in UI
    Used for CREATE/UPDATE/DELETE operations
    """
    try:
        if action == "create_dc":
            from app.services.dc import create_dc as create_dc_service
            from app.models import DCCreate
            from datetime import datetime
            
            # Auto-generate basics if missing
            # In a real app, you might want to fetch the next sequence number from DB
            import random
            dc_number = f"DC-{random.randint(1000, 9999)}"
            dc_date = datetime.now().strftime("%Y-%m-%d")
            
            # Map data to DCCreate model
            po_number = data.get("po_number")
            
            # Safe conversion of items
            items = []
            for item in data.get("items", []):
                items.append({
                    "po_item_id": item.get("po_item_id"),
                    "dispatch_qty": item.get("dispatch_qty"),
                    "lot_no": item.get("lot_no") or 1 # Default lot 1 if not specified
                })

            dc_create_model = DCCreate(
                dc_number=dc_number,
                dc_date=dc_date,
                po_number=po_number,
                remarks="Created via Voice Agent"
            )
            
            # Execute service (must be in transaction, router handles get_db which usually autocommits on exit? 
            # SQLite default isolation level in get_db needs verification, but usually OK)
            result = create_dc_service(dc_create_model, items, db)
            
            if result.success:
                logger.info(f"Action '{action}' executed successfully: {result.value}")
                return {
                    "success": True,
                    "message": f"Created Delivery Challan {dc_number} successfully",
                    "data": result.value
                }
            else:
                raise HTTPException(status_code=400, detail=result.message)

        # Handle other actions...
        logger.warning(f"Unknown action: {action}")
        return {
            "success": False,
            "message": f"Action '{action}' not implemented yet"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Action execution failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")
