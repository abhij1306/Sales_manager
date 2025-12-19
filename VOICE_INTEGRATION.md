# Voice and LLM Integration Guide

## Quick Start

### 1. Set Up Environment Variables

```bash
# Add to .env file
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Register Voice Router

Add to `backend/app/main.py`:

```python
from app.routers import voice

app.include_router(voice.router, prefix="/api", tags=["voice"])
```

### 3. Add Voice Component to Frontend

Add to your main layout (`frontend/app/layout.tsx`):

```tsx
import { VoiceInput } from '@/components/VoiceInput';

export default function RootLayout({ children }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceCommand = async (command: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: command })
      });
      
      const result = await response.json();
      
      // Show response to user
      alert(result.response_text);
      
      // Optionally navigate or refresh data
      if (result.success && result.action === 'create_dc') {
        router.push(`/dc/${result.result.dc_number}`);
      }
    } catch (error) {
      console.error('Voice command failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <html>
      <body>
        {children}
        <VoiceInput 
          onTranscript={(text) => console.log('Transcript:', text)}
          onCommand={handleVoiceCommand}
          isProcessing={isProcessing}
        />
      </body>
    </html>
  );
}
```

## Example Voice Commands

### Create Delivery Challan
```
"Create a delivery challan for PO 12345"
"Make a new DC for purchase order 67890"
```

### Query Data
```
"Show me pending deliveries for this month"
"What's the status of DC-2024-001?"
"List all invoices from last week"
```

### Get Help
```
"What can you help me with?"
"How do I create an invoice?"
```

## Integrating with OpenAI (Production)

Replace the mock `_call_llm` method in `llm_agent.py`:

```python
async def _call_llm(self, user_input: str, context: Optional[Dict] = None):
    import openai
    
    openai.api_key = self.api_key
    
    # Prepare function schemas
    functions = [
        {
            "name": "create_dc",
            "description": "Create a delivery challan for a purchase order",
            "parameters": self.schemas["create_dc"]["parameters"]
        },
        {
            "name": "query_pending_deliveries",
            "description": "Query pending deliveries for a given period",
            "parameters": {
                "type": "object",
                "properties": {
                    "month": {"type": "integer"},
                    "year": {"type": "integer"}
                }
            }
        }
    ]
    
    # Call OpenAI with function calling
    response = await openai.ChatCompletion.acreate(
        model=self.model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input}
        ],
        functions=functions,
        function_call="auto"
    )
    
    return response.choices[0].message
```

## Testing

### Test Voice Input (Browser Console)
```javascript
// Test speech recognition
const recognition = new webkitSpeechRecognition();
recognition.start();
recognition.onresult = (e) => console.log(e.results[0][0].transcript);
```

### Test API Endpoint
```bash
curl -X POST http://localhost:8000/api/voice/command \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Show me pending deliveries for this month"}'
```

## Next Steps

1. **Fine-tune prompts** for your specific domain
2. **Add more functions** (create invoice, update DC, etc.)
3. **Implement voice output** using Text-to-Speech API
4. **Add conversation history** for context-aware responses
5. **Implement user authentication** for voice commands

## Architecture Diagram

```
User Voice Input
       ↓
Web Speech API (Browser)
       ↓
VoiceInput Component
       ↓
POST /api/voice/command
       ↓
LLM Agent (OpenAI)
       ↓
Function Calling (JSON Schema)
       ↓
Service Layer (dc.py, invoice.py)
       ↓
Database
       ↓
Response → Voice Output
```
