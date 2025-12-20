# Voice Agent Testing Guide

## 🧪 Quick Start Testing

### Step 1: Verify Backend is Running

The backend should already be running. Let's verify the voice endpoints are available:

```bash
# Check if voice endpoints are registered
curl http://localhost:8000/api/docs
```

You should see the Voice Agent endpoints in the API documentation.

### Step 2: Test Speech-to-Text (STT)

**Option A: Using a test audio file**

If you have a `.webm` or `.wav` audio file:

```bash
curl -X POST http://localhost:8000/api/voice/stt \
  -F "audio=@path/to/your/audio.webm"
```

**Option B: Record audio in browser and test**

1. Open browser console (F12)
2. Paste this code to record 3 seconds of audio:

```javascript
// Record 3 seconds of audio
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);
const chunks = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  
  // Send to API
  const formData = new FormData();
  formData.append('audio', blob, 'test.webm');
  
  const response = await fetch('http://localhost:8000/api/voice/stt', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log('Transcription:', result.text);
  
  stream.getTracks().forEach(track => track.stop());
};

mediaRecorder.start();
console.log('Recording... speak now!');
setTimeout(() => {
  mediaRecorder.stop();
  console.log('Recording stopped');
}, 3000);
```

**Expected Response:**
```json
{
  "text": "your transcribed speech",
  "duration": 0.85,
  "language": "en"
}
```

### Step 3: Test Chat API

```bash
curl -X POST http://localhost:8000/api/voice/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me pending deliveries",
    "session_id": "test-session-123",
    "ui_context": {
      "current_page": "dashboard"
    }
  }'
```

**Expected Response:**
```json
{
  "type": "filter",
  "message": "Showing pending deliveries...",
  "session_id": "test-session-123"
}
```

### Step 4: Test Streaming Chat

```bash
curl -X POST http://localhost:8000/api/voice/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What can you help me with?",
    "session_id": "test-session-123"
  }'
```

**Expected Response (Server-Sent Events):**
```
data: {"type":"thinking","message":"Processing your request...","session_id":"test-session-123"}

data: {"type":"chunk","text":"I can help you with...","session_id":"test-session-123"}

data: {"type":"done","session_id":"test-session-123"}
```

---

## 🎨 Frontend Testing

### Step 1: Add Voice Agent to Your App

Open `frontend/app/layout.tsx` and add the VoiceAgent component:

```tsx
import { VoiceAgent } from '@/components/VoiceAgent';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        
        {/* Add Voice Agent */}
        <VoiceAgent
          onAction={(action) => {
            console.log('Voice action received:', action);
            
            // Handle different action types
            if (action.type === 'navigate') {
              console.log('Navigate to:', action.navigate?.page);
              // router.push(action.navigate.page);
            }
          }}
        />
      </body>
    </html>
  );
}
```

### Step 2: Open the App

1. Navigate to `http://localhost:3000`
2. You should see a floating microphone button in the bottom-right corner
3. Click it to open the voice agent

### Step 3: Test Voice Input

1. Click the microphone button in the chat
2. Allow microphone permissions when prompted
3. Speak clearly: **"Show me pending deliveries"**
4. Click the microphone again to stop recording
5. Watch the transcription appear
6. See the agent's response

### Step 4: Test Text Input

1. Type in the text box: **"Go to dashboard"**
2. Press Enter or click Send
3. See the instant response (regex match!)

---

## 🧪 Test Scenarios

### Scenario 1: Instant Commands (0ms latency)

These should respond immediately without LLM:

```
✅ "Go to dashboard"
✅ "Go to purchase orders"
✅ "Clear filters"
✅ "Help"
✅ "Stop"
```

### Scenario 2: Context-Aware Commands

First, navigate to a PO detail page, then test:

```
✅ "Create a DC for this"
✅ "Update this PO"
✅ "Show details for this"
```

The system should resolve "this" to the current PO number.

### Scenario 3: Entity Extraction

```
✅ "Show me PO 12345"
✅ "Find DC 998"
✅ "Create invoice for DC nine nine eight"
```

### Scenario 4: Multi-Turn Conversation

```
User: "Show me pending deliveries"
Agent: "You have 5 pending deliveries..."

User: "Show me the first one"
Agent: [Uses context to know which deliveries]
```

---

## 🔍 Debugging

### Check Backend Logs

The backend logs will show:

```
[INFO] STT completed in 0.85s
[INFO] Resolved references: "this PO" → "PO-12345"
[INFO] Intent classified: navigate (confidence: 1.0)
[INFO] Request completed: POST /api/voice/chat [duration=1500ms, status=200]
```

### Check Browser Console

Open DevTools (F12) and look for:

```
[API ✅] POST /api/voice/stt 850ms HTTP 200
[API ✅] POST /api/voice/chat 1500ms HTTP 200
Voice action received: {type: "navigate", ...}
```

### Common Issues

**Issue: "GROQ_API_KEY not configured"**
- Solution: Add your Groq API key to `.env`

**Issue: "Microphone access denied"**
- Solution: Allow microphone permissions in browser settings

**Issue: "Failed to fetch"**
- Solution: Check that backend is running on port 8000

**Issue: "Speech-to-text failed"**
- Solution: Check Groq API key is valid and has credits

---

## 📊 Performance Testing

### Measure Latency

Add this to your browser console:

```javascript
async function testLatency() {
  const start = performance.now();
  
  const response = await fetch('http://localhost:8000/api/voice/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "Show pending DCs",
      session_id: "perf-test"
    })
  });
  
  const end = performance.now();
  const result = await response.json();
  
  console.log(`Latency: ${(end - start).toFixed(0)}ms`);
  console.log('Response:', result);
}

testLatency();
```

**Target:** < 2000ms

### Measure STT Accuracy

Test with these phrases:

```
✅ "PO twelve three four five" → Should recognize "PO-12345"
✅ "DC nine nine eight" → Should recognize "DC-998"
✅ "Create delivery challan" → Should recognize "challan"
✅ "Show pending orders" → Should work perfectly
```

---

## 🎯 Success Criteria

Your voice agent is working correctly if:

- ✅ STT transcribes speech accurately (> 95%)
- ✅ Instant commands respond in < 1s
- ✅ LLM commands respond in < 3s
- ✅ Context resolution works ("this" → entity ID)
- ✅ Multi-turn conversations maintain context
- ✅ UI updates based on voice actions

---

## 🚀 Next Steps After Testing

Once basic testing works:

1. **Add to More Pages** - Integrate UI context tracking
2. **Expand Functions** - Add more ERP-specific commands
3. **Add TTS** - Make the agent speak responses
4. **Add Verification** - Implement dry-run for CREATE/UPDATE
5. **Production Deploy** - Add Redis for session storage

---

## 💡 Pro Tips

1. **Use Headphones** - Prevents echo during voice testing
2. **Speak Clearly** - Groq Whisper is good but not magic
3. **Test Edge Cases** - Try unusual commands
4. **Monitor Logs** - Watch backend logs for debugging
5. **Check API Docs** - Visit `/api/docs` for full API reference

---

Happy testing! 🎤🤖
