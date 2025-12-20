"""
Context Manager - Manages conversation state and history
Stores session data in Redis for fast access
"""
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import asyncio

logger = logging.getLogger(__name__)

# In-memory storage (will be Redis in production)
_sessions: Dict[str, 'ConversationContext'] = {}


@dataclass
class Message:
    """Single message in conversation"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ConversationContext:
    """Conversation state and history"""
    session_id: str
    history: List[Message]
    entities: Dict[str, Any]  # Tracked entities (PO numbers, DC numbers, etc.)
    current_intent: Optional[str] = None
    last_action: Optional[str] = None
    ui_context: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        self.updated_at = datetime.utcnow().isoformat()


class ContextManager:
    """Manages conversation contexts"""
    
    def __init__(self, max_history: int = 10, ttl_hours: int = 24):
        self.max_history = max_history
        self.ttl_hours = ttl_hours
    
    async def get_context(self, session_id: str) -> ConversationContext:
        """
        Get or create conversation context
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            ConversationContext instance
        """
        
        # Check in-memory storage
        if session_id in _sessions:
            context = _sessions[session_id]
            
            # Check if expired
            created = datetime.fromisoformat(context.created_at)
            if datetime.utcnow() - created > timedelta(hours=self.ttl_hours):
                logger.info(f"Session {session_id} expired, creating new")
                del _sessions[session_id]
            else:
                logger.debug(f"Retrieved context for session {session_id}")
                return context
        
        # Create new context
        context = ConversationContext(
            session_id=session_id,
            history=[],
            entities={}
        )
        
        _sessions[session_id] = context
        logger.info(f"Created new context for session {session_id}")
        
        return context
    
    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Add message to conversation history
        
        Args:
            session_id: Session identifier
            role: 'user' or 'assistant'
            content: Message content
            metadata: Optional metadata
        """
        
        context = await self.get_context(session_id)
        
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.utcnow().isoformat(),
            metadata=metadata
        )
        
        context.history.append(message)
        
        # Prune history if too long
        if len(context.history) > self.max_history * 2:  # Keep user+assistant pairs
            context.history = context.history[-self.max_history * 2:]
        
        context.updated_at = datetime.utcnow().isoformat()
        
        logger.debug(
            f"Added {role} message to session {session_id}",
            extra={"message_length": len(content)}
        )
    
    async def update_entities(self, session_id: str, entities: Dict[str, Any]):
        """
        Update tracked entities
        
        Args:
            session_id: Session identifier
            entities: Entity updates (merged with existing)
        """
        
        context = await self.get_context(session_id)
        context.entities.update(entities)
        context.updated_at = datetime.utcnow().isoformat()
        
        logger.debug(
            f"Updated entities for session {session_id}",
            extra={"entities": list(entities.keys())}
        )
    
    async def set_intent(self, session_id: str, intent: str):
        """Set current intent"""
        context = await self.get_context(session_id)
        context.current_intent = intent
        context.updated_at = datetime.utcnow().isoformat()
    
    async def set_last_action(self, session_id: str, action: str):
        """Set last executed action"""
        context = await self.get_context(session_id)
        context.last_action = action
        context.updated_at = datetime.utcnow().isoformat()
    
    async def update_ui_context(self, session_id: str, ui_context: Dict[str, Any]):
        """Update UI context (current page, active entities, etc.)"""
        context = await self.get_context(session_id)
        context.ui_context = ui_context
        context.updated_at = datetime.utcnow().isoformat()
    
    async def get_messages_for_llm(self, session_id: str) -> List[Dict[str, str]]:
        """
        Get conversation history formatted for LLM
        
        Returns:
            List of message dicts with 'role' and 'content'
        """
        
        context = await self.get_context(session_id)
        
        messages = []
        for msg in context.history[-self.max_history * 2:]:  # Last N exchanges
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        return messages
    
    async def clear_context(self, session_id: str):
        """Clear conversation context"""
        if session_id in _sessions:
            del _sessions[session_id]
            logger.info(f"Cleared context for session {session_id}")
    
    async def get_context_summary(self, session_id: str) -> Dict[str, Any]:
        """
        Get summary of conversation context
        
        Returns:
            {
                "session_id": "...",
                "message_count": 10,
                "entities": {...},
                "current_intent": "...",
                "last_action": "...",
                "created_at": "...",
                "updated_at": "..."
            }
        """
        
        context = await self.get_context(session_id)
        
        return {
            "session_id": context.session_id,
            "message_count": len(context.history),
            "entities": context.entities,
            "current_intent": context.current_intent,
            "last_action": context.last_action,
            "ui_context": context.ui_context,
            "created_at": context.created_at,
            "updated_at": context.updated_at
        }
    
    async def cleanup_expired(self):
        """Remove expired sessions"""
        expired = []
        cutoff = datetime.utcnow() - timedelta(hours=self.ttl_hours)
        
        for session_id, context in _sessions.items():
            created = datetime.fromisoformat(context.created_at)
            if created < cutoff:
                expired.append(session_id)
        
        for session_id in expired:
            del _sessions[session_id]
        
        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")


# Global instance
context_manager = ContextManager()


# Background task to cleanup expired sessions
async def cleanup_task():
    """Background task to cleanup expired sessions every hour"""
    while True:
        await asyncio.sleep(3600)  # 1 hour
        try:
            await context_manager.cleanup_expired()
        except Exception as e:
            logger.error(f"Cleanup task failed: {e}", exc_info=True)
