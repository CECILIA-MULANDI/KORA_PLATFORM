# AI Services Setup Guide for Policy Extraction

Your Kora Insurance Platform now supports multiple AI services for extracting policy data from uploaded documents. Choose the option that best fits your needs:

## 🆓 Option 1: Ollama (FREE - Recommended)

**Best for:** Privacy, cost-effectiveness, and offline operation

### Setup Steps:
1. **Install Ollama:**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Download a model:**
   ```bash
   ollama pull llama3.2        # Recommended (4GB)
   # OR
   ollama pull mistral         # Alternative (4GB)
   # OR  
   ollama pull codellama       # For code-heavy documents (7GB)
   ```

3. **Start Ollama:**
   ```bash
   ollama serve
   ```

4. **Configure your .env file:**
   ```env
   AI_SERVICE=ollama
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   ```

### Pros:
- ✅ Completely FREE
- ✅ Runs locally (privacy)
- ✅ No API limits
- ✅ Works offline

### Cons:
- ❌ Requires local resources (4-8GB RAM)
- ❌ Slower than cloud APIs

---

## 💰 Option 2: Anthropic Claude (PAID)

**Best for:** High accuracy and reliability

### Setup Steps:
1. **Get API Key:**
   - Go to [console.anthropic.com](https://console.anthropic.com)
   - Create account and get API key
   - Pricing: ~$0.25 per 1M input tokens

2. **Configure your .env file:**
   ```env
   AI_SERVICE=anthropic
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

### Pros:
- ✅ Very high accuracy
- ✅ Fast processing
- ✅ No local resources needed

### Cons:
- ❌ Costs money per request
- ❌ Requires internet connection
- ❌ Data sent to external service

---

## 💰 Option 3: Google Gemini AI (PAID)

**Best for:** Integration with Google services

### Setup Steps:
1. **Get API Key:**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create API key
   - Pricing: Free tier available, then ~$0.50 per 1M tokens

2. **Configure your .env file:**
   ```env
   AI_SERVICE=google
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here
   ```

### Pros:
- ✅ Good accuracy
- ✅ Free tier available
- ✅ Fast processing

### Cons:
- ❌ Costs money after free tier
- ❌ Requires internet connection
- ❌ Data sent to external service

---

## 🔧 Option 4: Regex Fallback (FREE)

**Best for:** Basic extraction without AI

### Setup Steps:
1. **Configure your .env file:**
   ```env
   AI_SERVICE=regex
   ```

### Pros:
- ✅ Completely FREE
- ✅ No external dependencies
- ✅ Very fast
- ✅ Works offline

### Cons:
- ❌ Lower accuracy
- ❌ Limited to simple patterns
- ❌ May miss complex document layouts

---

## 🚀 Quick Start (Recommended)

For the easiest setup, use **Ollama**:

```bash
# 1. Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Download model
ollama pull llama3.2

# 3. Start Ollama (in a separate terminal)
ollama serve

# 4. Copy environment file
cp .env.example .env

# 5. Edit .env file to use Ollama (already configured by default)
# AI_SERVICE=ollama is already set

# 6. Start your Kora server
npm start
```

## 🧪 Testing Your Setup

Upload a policy document via the API:

```bash
curl -X POST http://localhost:3001/api/policies/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "policy_document=@sample_policy.pdf"
```

The response will show:
- Extracted text from the document
- Structured policy data
- Confidence score
- Which AI service was used

## 🔄 Switching Between Services

You can easily switch between AI services by changing the `AI_SERVICE` variable in your `.env` file:

```env
# Switch to Claude
AI_SERVICE=anthropic

# Switch to Google AI  
AI_SERVICE=google

# Switch to regex only
AI_SERVICE=regex

# Switch back to Ollama
AI_SERVICE=ollama
```

No code changes needed - just restart your server!

## 📊 Performance Comparison

| Service | Cost | Accuracy | Speed | Privacy |
|---------|------|----------|-------|---------|
| Ollama | FREE | High | Medium | Excellent |
| Claude | $$ | Very High | Fast | Poor |
| Google AI | $ | High | Fast | Poor |
| Regex | FREE | Medium | Very Fast | Excellent |

## 🆘 Troubleshooting

**Ollama not working?**
- Make sure `ollama serve` is running
- Check if the model is downloaded: `ollama list`
- Verify the URL: `curl http://localhost:11434/api/tags`

**API services not working?**
- Check your API keys are correct
- Verify you have credits/quota remaining
- Check internet connection

**Low extraction accuracy?**
- Try a different AI service
- Ensure document quality is good
- Check if document is in English

---

**Need help?** The system automatically falls back to regex extraction if the AI service fails, so your application will always work!
