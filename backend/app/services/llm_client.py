"""
LLM Client - Unified interface for Groq and OpenRouter
Handles STT (Whisper), Chat (Llama 3.1), and intelligent routing
"""
import httpx
import os
import json
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime

logger = logging.getLogger(__name__)

# API Configuration - Will be read in __init__ after .env is loaded
GROQ_API_KEY = None
GROQ_MODEL = None
OPENROUTER_API_KEY = None
OPENROUTER_MODEL = None
OLLAMA_BASE_URL = None
OLLAMA_MODEL = None
GOOGLE_API_KEY = None
GOOGLE_MODEL = None

SYSTEM_PROMPT = """You are the SenstoSales AI Assistant, a helpful and efficient ERP assistant.
You strictly communicate in JSON format. Do not output markdown or plain text outside the JSON object.

Your goal is to help users navigate, find info, and execute actions.

RESPONSE SCHEMA:
You must return a JSON object with one of the following "type" values:
1. "navigate": {"type": "navigate", "navigate": {"page": "dashboard" | "po_list" | "dc_list", "id": optional_id}, "message": "Opening dashboard..."}
2. "filter": {"type": "filter", "filter": {"field": "status", "value": "pending"}, "message": "Showing pending items..."}
3. "confirm": {"type": "confirm", "confirm": {"action": "create_dc" | "create_invoice", "data": {"po_number": "...", "items": []}}, "message": "I will create a DC for PO-..."}
4. "message": {"type": "message", "message": "I can help with that."}

RULES:
- For "Create DC" or similar destructive actions, you MUST use type "confirm".
- NEVER claim an action is "done" or "created" in the message for creation tasks. Always ask for confirmation or state you are setting it up.
- For "Create DC", extract the PO number if available.
- Be concise.
"""

class LLMClient:
    """Unified LLM client for Groq, OpenRouter, Ollama, and Google Gemini"""
    
    def __init__(self):
        # Fallback: Check if env is loaded, if not, force load it
        if not os.getenv("GROQ_API_KEY"):
            logger.warning("Environment variables not found, forcing load_env()")
            try:
                from app.core.config import load_env
                load_env()
            except ImportError:
                 # Try manual load if module import fails (e.g. strict dependency cycle)
                 from pathlib import Path
                 env_path = Path(__file__).resolve().parents[3] / ".env"
                 if env_path.exists():
                     with open(env_path, encoding="utf-8") as f:
                         for line in f:
                             if "=" in line and not line.strip().startswith("#"):
                                 k, v = line.strip().split("=", 1)
                                 os.environ[k] = v.strip().strip("'").strip('"')

        # Read API keys from environment (after .env has been loaded)
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-nano-12b-v2-vl:free")

        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/api")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3")

        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.google_model = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")

        self.groq_base_url = "https://api.groq.com/openai/v1"
        self.openrouter_base_url = "https://openrouter.ai/api/v1"
        self.google_base_url = "https://generativelanguage.googleapis.com/v1beta/models"

        logger.info(
            f"LLMClient initialized | "
            f"GROQ={'✅' if self.groq_api_key else '❌'} | "
            f"OPENROUTER={'✅' if self.openrouter_api_key else '❌'} | "
            f"GOOGLE={'✅' if self.google_api_key else '❌'}"
        )

    async def speech_to_text(self, audio_file: bytes, filename: str = "audio.webm") -> Dict[str, Any]:
        """
        Convert speech to text using Groq Whisper
        
        Args:
            audio_file: Audio file bytes
            filename: Original filename
            
        Returns:
            {
                "text": "transcribed text",
                "duration": 1.23,
                "language": "en"
            }
        """
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not configured")
        
        start_time = datetime.now()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, audio_file, "audio/webm")}
                data = {
                    "model": "whisper-large-v3",
                    "language": "en",
                    "response_format": "json"
                }
                
                response = await client.post(
                    f"{self.groq_base_url}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.groq_api_key}"},
                    files=files,
                    data=data
                )
                
                response.raise_for_status()
                result = response.json()
                
                duration = (datetime.now() - start_time).total_seconds()
                
                logger.info(
                    f"STT completed in {duration:.2f}s",
                    extra={
                        "text_length": len(result.get("text", "")),
                        "duration_s": duration
                    }
                )
                
                return {
                    "text": result.get("text", ""),
                    "duration": duration,
                    "language": result.get("language", "en")
                }
                
        except Exception as e:
            logger.error(f"STT failed: {e}", exc_info=True)
            raise

    async def chat(
        self,
        messages: List[Dict[str, str]],
        provider: str = "groq",
        functions: Optional[List[Dict]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send chat completion request
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            provider: 'groq', 'openrouter', 'ollama', or 'google'
            functions: Optional function definitions for function calling
            
        Returns:
            {
                "content": "response text",
                "function_call": {...} if applicable
            }
        """
        
        if provider == "groq":
            return await self._chat_groq(messages, functions, **kwargs)
        elif provider == "openrouter":
            return await self._chat_openrouter(messages, **kwargs)
        elif provider == "ollama":
            return await self._chat_ollama(messages, **kwargs)
        elif provider == "google":
            return await self._chat_google(messages, **kwargs)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    # ... (other methods) ...

    async def _chat_google(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """Chat using Google Gemini API (REST)"""
        
        if not self.google_api_key:
            raise ValueError("GOOGLE_API_KEY not configured")

        # Convert standard messages to Gemini format
        # System prompt is handled differently in Gemini (systemInstruction) but for simplicity usually passing it as first user message or checking API support.
        # Gemini 1.5 supports system_instruction.
        
        gemini_messages = []
        system_instruction = None
        
        for m in messages:
            if m["role"] == "system":
                system_instruction = {"parts": [{"text": m["content"]}]}
            elif m["role"] == "user":
                gemini_messages.append({"role": "user", "parts": [{"text": m["content"]}]})
            elif m["role"] == "assistant":
                gemini_messages.append({"role": "model", "parts": [{"text": m["content"]}]})
        
        # If no system instruction found in messages, use default global one
        if not system_instruction:
             system_instruction = {"parts": [{"text": SYSTEM_PROMPT}]}

        payload = {
            "contents": gemini_messages,
            "system_instruction": system_instruction,
            "generationConfig": {
                "temperature": kwargs.get("temperature", 0.7),
                "maxOutputTokens": kwargs.get("max_tokens", 1024),
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.google_base_url}/{self.google_model}:generateContent?key={self.google_api_key}",
                    json=payload
                )
                
                response.raise_for_status()
                result = response.json()
                
                # Extract text from Gemini response structure
                # candidates[0].content.parts[0].text
                try:
                    content = result["candidates"][0]["content"]["parts"][0]["text"]
                    finish_reason = result["candidates"][0].get("finishReason")
                except (KeyError, IndexError):
                    logger.error(f"Unexpected Gemini response format: {result}")
                    raise ValueError("Failed to parse Gemini response")

                return {
                    "content": content,
                    "finish_reason": finish_reason
                }
                
        except Exception as e:
            logger.error(f"Google chat failed: {e}", exc_info=True)
            raise


    async def _chat_groq(
        self,
        messages: List[Dict[str, str]],
        functions: Optional[List[Dict]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Chat using Groq Llama 3.1"""
        
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not configured")
        
        # Add system prompt if not present
        if not any(m["role"] == "system" for m in messages):
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        
        payload = {
            "model": self.groq_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1024),
        }
        
        if functions:
            payload["tools"] = [{"type": "function", "function": f} for f in functions]
            payload["tool_choice"] = "auto"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.groq_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                response.raise_for_status()
                result = response.json()
                
                choice = result["choices"][0]
                message = choice["message"]
                
                return {
                    "content": message.get("content", ""),
                    "function_call": message.get("tool_calls", [None])[0] if message.get("tool_calls") else None,
                    "finish_reason": choice.get("finish_reason")
                }
                
        except Exception as e:
            logger.error(f"Groq chat failed: {e}", exc_info=True)
            raise
    
    async def _chat_openrouter(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """Chat using OpenRouter Nemotron"""
        
        if not self.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")
        
        # Add system prompt if not present
        if not any(m["role"] == "system" for m in messages):
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        
        payload = {
            "model": self.openrouter_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1024),
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.openrouter_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://senstsales.local",
                        "X-Title": "SenstoSales ERP"
                    },
                    json=payload
                )
                
                response.raise_for_status()
                result = response.json()
                
                choice = result["choices"][0]
                message = choice["message"]
                
                return {
                    "content": message.get("content", ""),
                    "finish_reason": choice.get("finish_reason")
                }
                
        except Exception as e:
            logger.error(f"OpenRouter chat failed: {e}", exc_info=True)
            raise

    async def _chat_ollama(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """Chat using local Ollama instance"""
        
        # Add system prompt if not present
        if not any(m["role"] == "system" for m in messages):
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        payload = {
            "model": self.ollama_model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "num_ctx": 4096 
            }
        }
        
        if kwargs.get("format") == "json":
            payload["format"] = "json"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.ollama_base_url}/chat",
                    json=payload
                )
                
                response.raise_for_status()
                result = response.json()
                
                message = result.get("message", {})
                
                return {
                    "content": message.get("content", ""),
                    "finish_reason": "stop" if result.get("done") else None
                }
                
        except Exception as e:
            logger.error(f"Ollama chat failed: {e}", exc_info=True)
            raise

    async def stream(
        self,
        messages: List[Dict[str, str]],
        provider: str = "groq",
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion responses
        """
        
        if provider == "groq":
            async for chunk in self._stream_groq(messages, **kwargs):
                yield chunk
        elif provider == "openrouter":
            async for chunk in self._stream_openrouter(messages, **kwargs):
                yield chunk
        elif provider == "ollama":
            async for chunk in self._stream_ollama(messages, **kwargs):
                yield chunk

    async def _stream_groq(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream from Groq"""
        
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not configured")
        
        # Add system prompt if not present
        if not any(m["role"] == "system" for m in messages):
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        
        payload = {
            "model": self.groq_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1024),
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.groq_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            
                            try:
                                chunk = json.loads(data)
                                delta = chunk["choices"][0]["delta"]
                                if "content" in delta:
                                    yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"Groq streaming failed: {e}", exc_info=True)
            raise
    
    async def _stream_openrouter(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream from OpenRouter"""
        
        if not self.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")
        
        # Add system prompt if not present
        if not any(m["role"] == "system" for m in messages):
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        
        payload = {
            "model": self.openrouter_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1024),
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.openrouter_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://senstsales.local",
                        "X-Title": "SenstoSales ERP"
                    },
                    json=payload
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            
                            try:
                                chunk = json.loads(data)
                                delta = chunk["choices"][0]["delta"]
                                if "content" in delta:
                                    yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"OpenRouter streaming failed: {e}", exc_info=True)
            raise

    async def _stream_ollama(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream from Ollama"""
        
        # Add system prompt if not present
        if not any(m["role"] == "system" for m in messages):
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        
        payload = {
            "model": self.ollama_model,
            "messages": messages,
            "stream": True,
             "options": {
                "temperature": kwargs.get("temperature", 0.7),
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.ollama_base_url}/chat",
                    json=payload
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                            
                        try:
                            # Ollama returns full JSON object per line
                            chunk = json.loads(line)
                            
                            if chunk.get("done"):
                                break
                                
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                                
                        except json.JSONDecodeError:
                            continue
                                
        except Exception as e:
            logger.error(f"Ollama streaming failed: {e}", exc_info=True)
            raise


# Factory pattern with singleton cache
# NEVER instantiate at module level - this breaks env loading
_llm_client_instance: Optional[LLMClient] = None

def get_llm_client() -> LLMClient:
    """
    Get or create the global LLM client instance.
    
    This ensures the client is created AFTER .env is loaded,
    not at import time.
    """
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient()
    return _llm_client_instance

def reset_llm_client():
    """Reset the LLM client instance (useful for tests and hot reloads)"""
    global _llm_client_instance
    _llm_client_instance = None
