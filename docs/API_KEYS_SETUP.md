# 🔑 API Keys Setup

## Required API Keys

To use the voice agent, you need to add your API keys to the `.env` file.

### 1. Add to `.env` file

Open `c:\Users\abhij\.gemini\antigravity\scratch\SenstoSales\.env` and add:

```bash
# Groq API (Required for voice features)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# OpenRouter API (Optional - for complex queries)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
```

### 2. Get Your API Keys

**Groq API Key:**
1. Go to https://console.groq.com/
2. Sign up / Log in
3. Go to API Keys section
4. Create a new API key
5. Copy and paste it into `.env`

**OpenRouter API Key (Optional):**
1. Go to https://openrouter.ai/
2. Sign up / Log in
3. Go to Keys section
4. Create a new API key
5. Copy and paste it into `.env`

### 3. Restart Backend

After adding the keys, restart the backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Test

Run the test script again:

```bash
python test_voice_agent.py
```

You should now see successful responses!

---

## ✅ Voice Agent is Now Active!

Once the API keys are added:

1. **Visit** `http://localhost:3000`
2. **Look for** the floating microphone button in the bottom-right corner
3. **Click it** to open the voice agent
4. **Try saying:** "Show me pending deliveries" or "Go to dashboard"

---

## 🎤 Quick Test Commands

**Instant Commands (0ms):**
- "Go to dashboard"
- "Clear filters"
- "Help"

**Voice Commands (with LLM):**
- "Show me pending deliveries"
- "Find PO 12345"
- "Create a delivery challan"

---

## 🐛 Troubleshooting

**Error: "GROQ_API_KEY not configured"**
- Solution: Add your Groq API key to `.env` and restart backend

**Error: "Microphone access denied"**
- Solution: Allow microphone permissions in browser settings

**Error: "Failed to fetch"**
- Solution: Make sure backend is running on port 8000

---

Enjoy your AI-powered ERP! 🎉
