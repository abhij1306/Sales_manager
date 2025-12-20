# Voice Agent - Production-Grade Implementation Plan (REVISED)

## 🎯 Critical Improvements Applied

Based on expert feedback, this plan addresses:
1. ✅ **Groq Whisper STT** (not Web Speech API)
2. ✅ **UI Context Awareness** (deictic references)
3. ✅ **Strict Verification Loops** (prevent hallucinations)
4. ✅ **Streaming Responses** (sub-2s TTFB)
5. ✅ **Redis Context Storage** (speed + persistence)
6. ✅ **Optimistic UI** (instant feedback)
7. ✅ **Domain Vocabulary** (ERP-specific terms)

---

## 🏗️ Revised Architecture

### Audio Flow (Groq Whisper)

```
Frontend                    Backend                      Groq
   │                           │                          │
   ├─ Record Audio Blob        │                          │
   │  (MediaRecorder)          │                          │
   │                           │                          │
   ├─ POST /api/voice/stt ────>│                          │
   │                           │                          │
   │                           ├─ Groq Whisper API ──────>│
   │                           │  (blazing fast STT)      │
   │                           │                          │
   │                           │<─ Transcribed Text ──────┤
   │<─ { text: "..." } ────────┤                          │
   │                           │                          │
   ├─ Display Text             │                          │
   ├─ POST /api/voice/chat ───>│                          │
   │  + ui_context             │                          │
   │                           │                          │
   │                           ├─ Intent + Context        │
   │                           ├─ Groq Llama 3.1 ────────>│
   │                           │  (function calling)      │
   │                           │                          │
   │<─ Stream Response ────────┤<─ Streaming JSON ────────┤
   │  (SSE)                    │                          │
   │                           │                          │
   └─ TTS + UI Update          │                          │
```

**Key Changes:**
- ❌ No Web Speech API (unreliable)
- ✅ Groq Whisper (accurate, fast, alphanumeric-friendly)
- ✅ Streaming responses (TTFB < 500ms)
- ✅ UI context sent with every request

---

## 📐 Step 0: State Schema Definition

### UI Action Schema

**The LLM outputs structured JSON that controls the frontend:**

```typescript
// State Schema - What the LLM can do
interface VoiceAgentAction {
  type: 'navigate' | 'filter' | 'fill_form' | 'show_data' | 'confirm' | 'error';
  
  // Navigation
  navigate?: {
    page: 'po_list' | 'po_detail' | 'dc_list' | 'dc_create' | 'invoice_list';
    entity_id?: string; // e.g., "PO-12345"
  };
  
  // Filtering
  filter?: {
    entity: 'po' | 'dc' | 'invoice';
    filters: {
      status?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    };
  };
  
  // Form Filling
  fill_form?: {
    form_id: string;
    fields: Record<string, any>;
  };
  
  // Data Display
  show_data?: {
    title: string;
    data: any[];
    format: 'table' | 'list' | 'summary';
  };
  
  // Confirmation Required
  confirm?: {
    action: string;
    message: string;
    data: any;
    confirm_endpoint: string; // Where to POST on "yes"
  };
  
  // Error
  error?: {
    message: string;
    suggestions?: string[];
  };
  
  // Agent Response (always present)
  message: string; // What the agent says
  tts_text?: string; // Optimized for TTS (shorter)
}
```

**Example Outputs:**

```json
// Navigation
{
  "type": "navigate",
  "navigate": {
    "page": "po_detail",
    "entity_id": "PO-12345"
  },
  "message": "Opening PO-12345 for you.",
  "tts_text": "Opening PO twelve three four five"
}

// Filter
{
  "type": "filter",
  "filter": {
    "entity": "dc",
    "filters": {
      "status": "pending",
      "date_from": "2024-12-01"
    }
  },
  "message": "Showing pending DCs from December 1st.",
  "tts_text": "Here are your pending deliveries from December first"
}

// Confirmation (Strict Verification)
{
  "type": "confirm",
  "confirm": {
    "action": "create_dc",
    "message": "I'll create a DC for PO-12345 with these items:\n- Widget A: 100 units\n- Widget B: 50 units\nTotal: 150 units. Confirm?",
    "data": {
      "po_number": "PO-12345",
      "items": [...]
    },
    "confirm_endpoint": "/api/voice/confirm/create_dc"
  },
  "message": "Ready to create DC. Please confirm.",
  "tts_text": "I'll create a delivery challan for PO twelve three four five with one hundred fifty units total. Should I proceed?"
}
```

---

## 🎤 Phase 1: Groq Whisper STT Integration

### 1.1 STT Endpoint
**[backend/app/routers/voice.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/routers/voice.py)**

```python
from fastapi import UploadFile, File
import httpx

@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Convert speech to text using Groq Whisper
    
    Accepts: audio/webm, audio/wav, audio/mp3
    Returns: { "text": "transcribed text", "duration": 1.23 }
    """
    
    # Groq Whisper API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (audio.filename, audio.file, audio.content_type)},
            data={
                "model": "whisper-large-v3",
                "language": "en",
                "response_format": "json"
            }
        )
    
    result = response.json()
    
    return {
        "text": result["text"],
        "duration": result.get("duration", 0)
    }
```

### 1.2 Frontend Audio Recording
**[frontend/components/VoiceAgent.tsx](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/frontend/components/VoiceAgent.tsx)**

```typescript
const recordAudio = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm'
  });
  
  const chunks: Blob[] = [];
  
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    
    // Send to backend
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await fetch('/api/voice/stt', {
      method: 'POST',
      body: formData
    });
    
    const { text } = await response.json();
    setTranscript(text);
    
    // Now send to chat with UI context
    await sendToChat(text);
  };
  
  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // Max 5s
};
```

---

## 🧠 Phase 2: UI Context Awareness

### 2.1 UI Context Provider
**[frontend/lib/uiContext.ts](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/frontend/lib/uiContext.ts)** (NEW)

```typescript
interface UIContext {
  current_page: string;
  active_entity_id?: string;
  active_entity_type?: 'po' | 'dc' | 'invoice';
  visible_ids: string[];
  filters?: Record<string, any>;
  form_data?: Record<string, any>;
}

class UIContextManager {
  private context: UIContext = {
    current_page: 'dashboard',
    visible_ids: []
  };
  
  setPage(page: string) {
    this.context.current_page = page;
  }
  
  setActiveEntity(type: string, id: string) {
    this.context.active_entity_type = type as any;
    this.context.active_entity_id = id;
  }
  
  setVisibleIds(ids: string[]) {
    this.context.visible_ids = ids;
  }
  
  getContext(): UIContext {
    return { ...this.context };
  }
}

export const uiContext = new UIContextManager();
```

### 2.2 Enhanced Chat Endpoint
**[backend/app/routers/voice.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/routers/voice.py)**

```python
class ChatRequest(BaseModel):
    message: str
    session_id: str
    ui_context: Dict[str, Any]  # NEW!

@router.post("/chat")
async def voice_chat(request: ChatRequest):
    """
    Process voice command with UI context
    
    ui_context example:
    {
        "current_page": "po_detail",
        "active_entity_id": "PO-12345",
        "visible_ids": ["PO-12345", "PO-67890"]
    }
    """
    
    # Resolve deictic references
    message = resolve_references(request.message, request.ui_context)
    # "Update this PO" → "Update PO-12345"
    
    # Continue with LLM...
```

### 2.3 Reference Resolution
**[backend/app/services/reference_resolver.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/services/reference_resolver.py)** (NEW)

```python
def resolve_references(message: str, ui_context: Dict) -> str:
    """
    Resolve deictic references like "this", "that", "it"
    
    Examples:
    - "Update this PO" + active_entity_id="PO-12345" → "Update PO-12345"
    - "Show me that" + visible_ids=["DC-998"] → "Show me DC-998"
    """
    
    # Replace "this" with active entity
    if "this" in message.lower() and ui_context.get("active_entity_id"):
        message = message.replace("this", ui_context["active_entity_id"])
    
    # Replace "that" with first visible entity
    if "that" in message.lower() and ui_context.get("visible_ids"):
        message = message.replace("that", ui_context["visible_ids"][0])
    
    return message
```

---

## 🔒 Phase 3: Strict Verification Loop

### 3.1 Dry Run System
**[backend/app/services/verification.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/services/verification.py)** (NEW)

```python
class VerificationService:
    """
    Performs dry runs for CREATE/UPDATE/DELETE operations
    """
    
    async def verify_create_dc(self, po_number: str, items: List[Dict]) -> Dict:
        """
        Verify DC creation before committing
        
        Returns:
        {
            "valid": true,
            "summary": "DC for PO-12345 with 3 items (150 units total)",
            "warnings": ["Item A quantity exceeds PO remaining"],
            "data": { ... verified data ... }
        }
        """
        
        # 1. Verify PO exists
        po = await get_po(po_number)
        if not po:
            return {"valid": False, "error": f"PO {po_number} not found"}
        
        # 2. Verify items exist in PO
        verified_items = []
        warnings = []
        
        for item in items:
            po_item = find_po_item(po, item["description"])
            if not po_item:
                warnings.append(f"Item '{item['description']}' not found in PO")
                continue
            
            # Check quantity
            if item["quantity"] > po_item["remaining_quantity"]:
                warnings.append(
                    f"{item['description']}: requested {item['quantity']}, "
                    f"only {po_item['remaining_quantity']} remaining"
                )
            
            verified_items.append({
                "po_item_id": po_item["id"],
                "description": po_item["description"],
                "quantity": min(item["quantity"], po_item["remaining_quantity"])
            })
        
        total_units = sum(i["quantity"] for i in verified_items)
        
        return {
            "valid": len(verified_items) > 0,
            "summary": f"DC for {po_number} with {len(verified_items)} items ({total_units} units total)",
            "warnings": warnings,
            "data": {
                "po_number": po_number,
                "items": verified_items
            }
        }
```

### 3.2 Confirmation Flow
**[backend/app/routers/voice.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/routers/voice.py)**

```python
@router.post("/confirm/{action}")
async def confirm_action(action: str, data: Dict):
    """
    Execute confirmed action
    
    Only called after user confirms in UI
    """
    
    if action == "create_dc":
        result = await dc_service.create_dc(data)
        return {
            "success": True,
            "message": f"DC-{result.dc_number} created successfully",
            "dc_number": result.dc_number
        }
    
    # ... other actions
```

---

## ⚡ Phase 4: Streaming & Optimistic UI

### 4.1 Streaming Endpoint
**[backend/app/routers/voice.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/routers/voice.py)**

```python
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def voice_chat_stream(request: ChatRequest):
    """
    Stream LLM response for instant TTFB
    """
    
    async def generate():
        # Quick intent classification (Groq - fast!)
        intent = await classify_intent(request.message)
        
        # Send immediate feedback
        yield json.dumps({
            "type": "thinking",
            "intent": intent,
            "message": f"Searching {intent}..."
        }) + "\n"
        
        # Stream LLM response
        async for chunk in llm_client.stream(messages):
            yield json.dumps({"type": "chunk", "text": chunk}) + "\n"
        
        # Final action
        yield json.dumps({
            "type": "action",
            "action": final_action
        }) + "\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### 4.2 Optimistic UI
**[frontend/components/VoiceAgent.tsx](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/frontend/components/VoiceAgent.tsx)**

```typescript
const sendToChat = async (text: string) => {
  // Immediate feedback
  setStatus('thinking');
  setMessage('Processing your request...');
  
  const eventSource = new EventSource(`/api/voice/chat/stream?message=${text}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'thinking') {
      // Show intent-based message
      setMessage(data.message); // "Searching pending deliveries..."
    }
    
    if (data.type === 'chunk') {
      // Append streaming text
      appendText(data.text);
      
      // Start TTS as soon as we have a sentence
      if (data.text.includes('.')) {
        speakText(getCurrentSentence());
      }
    }
    
    if (data.type === 'action') {
      // Execute UI action
      executeAction(data.action);
    }
  };
};
```

---

## 🎯 Phase 5: Domain-Specific Optimizations

### 5.1 System Prompt
**[backend/app/services/llm_client.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/services/llm_client.py)**

```python
SYSTEM_PROMPT = """You are an ERP voice assistant for SenstoSales.

DOMAIN VOCABULARY:
- "DC" = Delivery Challan (NOT "District of Columbia")
- "PO" = Purchase Order
- "Challan" = Delivery document (Indian English term)
- PO format: "PO-" followed by 5 digits (e.g., "PO-12345")
- DC format: "DC-" followed by 3-4 digits (e.g., "DC-998")
- Invoice format: "INV-" followed by year and number (e.g., "INV-2024-001")

ALPHANUMERIC HANDLING:
- When user says numbers, always format with leading zeros
- "twelve three four five" → "PO-12345" (NOT "PO-12345")
- "nine nine eight" → "DC-998"

RESPONSE FORMAT:
- Always output valid JSON matching the VoiceAgentAction schema
- For CREATE/UPDATE/DELETE, always return type="confirm" first
- Never execute destructive actions without confirmation

NAVIGATION KEYWORDS (instant execution):
- "Go to [page]" → navigate immediately
- "Show me [entity]" → filter/search
- "Clear filters" → reset filters
"""
```

### 5.2 Regex/Keyword Layer
**[backend/app/services/intent_classifier.py](file:///c:/Users/abhij/.gemini/antigravity/scratch/SenstoSales/backend/app/services/intent_classifier.py)**

```python
INSTANT_COMMANDS = {
    r"^go to (.+)$": lambda match: {
        "type": "navigate",
        "navigate": {"page": match.group(1).replace(" ", "_")},
        "message": f"Navigating to {match.group(1)}"
    },
    r"^clear filters?$": lambda _: {
        "type": "filter",
        "filter": {"entity": "current", "filters": {}},
        "message": "Filters cleared"
    },
    r"^stop$": lambda _: {
        "type": "cancel",
        "message": "Cancelled"
    }
}

async def classify_intent(text: str) -> Dict:
    """
    Check instant commands first (0ms latency)
    Then use LLM for complex intents
    """
    
    text_lower = text.lower().strip()
    
    # Check regex patterns
    for pattern, handler in INSTANT_COMMANDS.items():
        match = re.match(pattern, text_lower)
        if match:
            return handler(match)
    
    # Fall back to LLM
    return await llm_classify(text)
```

---

## 📊 Answers to Questions (REVISED)

### 1. Prioritize Groq (speed) or OpenRouter (capability)?

**Answer: Groq for 95% of interactions**

**Strategy:**
- ✅ Groq Whisper: All STT (blazing fast)
- ✅ Groq Llama 3.1: Navigation, CRUD, Queries (sub-2s)
- ✅ OpenRouter Nemotron: Only for "Why?" questions and analysis

**Routing Logic:**
```python
if intent in ["navigate", "filter", "create", "query"]:
    provider = "groq"  # Fast!
elif intent in ["analyze", "explain", "compare"]:
    provider = "openrouter"  # Capable!
```

### 2. Streaming or batch?

**Answer: Streaming (mandatory)**

**Benefits:**
- ✅ TTFB < 500ms (user sees response immediately)
- ✅ TTS starts before full response (feels instant)
- ✅ Optimistic UI updates (show "Searching..." immediately)

### 3. Database or memory for history?

**Answer: Redis + Async Postgres**

**Implementation:**
```python
# Active session (fast)
await redis.setex(f"session:{session_id}", 3600, json.dumps(context))

# Async persistence (audit log)
asyncio.create_task(
    db.execute("INSERT INTO conversation_logs ...")
)
```

### 4. Priority commands?

**Answer: Navigation & Filtering (highest ROI)**

**Priority List:**
1. ✅ "Go to [page]" - Instant navigation
2. ✅ "Filter by [status/date]" - Table filtering
3. ✅ "Find [PO/DC number]" - Quick search
4. ✅ "Clear filters" - Reset
5. ✅ "Show pending [entity]" - Status queries

---

## 🚀 Implementation Order (REVISED)

### Week 1: Core Infrastructure
1. ✅ Groq Whisper STT endpoint
2. ✅ UI Context Provider
3. ✅ Streaming chat endpoint
4. ✅ Redis context storage
5. ✅ System prompt with domain vocabulary

### Week 2: Verification & Safety
1. ✅ Dry run verification service
2. ✅ Confirmation flow
3. ✅ Reference resolver (deictic)
4. ✅ Regex/keyword instant commands

### Week 3: Frontend & UX
1. ✅ Audio recording component
2. ✅ Streaming response handler
3. ✅ Optimistic UI states
4. ✅ TTS integration
5. ✅ Confirmation dialogs

### Week 4: Polish & Testing
1. ✅ Error recovery
2. ✅ Fuzzy matching
3. ✅ Performance optimization
4. ✅ User testing

---

## 📁 New Files Required

### Backend
- `backend/app/routers/voice.py` (UPDATE) - Add STT, streaming
- `backend/app/services/llm_client.py` (NEW) - Groq + OpenRouter
- `backend/app/services/verification.py` (NEW) - Dry run system
- `backend/app/services/reference_resolver.py` (NEW) - Deictic resolution
- `backend/app/services/intent_classifier.py` (UPDATE) - Regex layer

### Frontend
- `frontend/lib/uiContext.ts` (NEW) - UI context manager
- `frontend/components/VoiceAgent.tsx` (UPDATE) - Audio recording, streaming
- `frontend/lib/tts.ts` (NEW) - Text-to-speech

---

## 🎉 Expected Results

**Performance:**
- ✅ STT latency: < 1s (Groq Whisper)
- ✅ LLM latency: < 2s (Groq Llama)
- ✅ TTFB: < 500ms (streaming)
- ✅ Total round-trip: < 3s

**Accuracy:**
- ✅ Alphanumeric recognition: 95%+ (Whisper)
- ✅ Intent classification: 90%+
- ✅ Zero hallucination on CRUD (verification loop)

**UX:**
- ✅ Instant feedback (optimistic UI)
- ✅ Natural conversations (context awareness)
- ✅ Safe operations (confirmation required)

---

**Ready to build the fastest, most accurate ERP voice assistant!** 🚀🎤
