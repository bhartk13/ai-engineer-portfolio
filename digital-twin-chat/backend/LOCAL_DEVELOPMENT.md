# Local Development Guide

This guide explains how to set up and run the Digital Twin Chat backend locally for development and testing.

## Prerequisites

- Python 3.11 or higher
- pip (Python package manager)
- OpenAI API key (or AWS credentials if using Bedrock)

## Quick Start

### 1. Install Dependencies

```bash
cd digital-twin-chat/backend
pip install -r requirements.txt
```

### 2. Configure Environment

The `.env` file has been created with default local development settings. You need to:

1. **Set your OpenAI API key** (required):
   ```bash
   # Edit .env file and replace:
   OPENAI_API_KEY=your-openai-api-key-here
   # with your actual OpenAI API key
   ```

2. **Customize your persona** (optional):
   - The system is configured to use `linkedin.pdf` by default
   - You can use either a PDF file (like a LinkedIn export) or a text file
   - To use a text file instead, edit `.env` and change:
     ```
     LOCAL_PERSONA_PATH=./me.txt
     ```
   - The system automatically detects the file type and extracts content accordingly

### 3. Run the Server

```bash
python run_local.py
```

The script will:
- ✓ Verify the local storage directory exists (creates it if needed)
- ✓ Check that the persona file (me.txt) exists
- ✓ Validate API key configuration
- 🚀 Start the FastAPI server on http://localhost:8000

### 4. Test the API

Once running, you can:

- **View API Documentation**: http://localhost:8000/docs
- **View Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Send Chat Message
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! Tell me about your experience with Python.",
    "session_id": "test-session-123"
  }'
```

### Get Chat History
```bash
curl http://localhost:8000/api/chat/history/test-session-123
```

## Local Storage

Conversation history is stored locally in the `local_storage/` directory:
- Each session creates a JSON file: `local_storage/{session_id}.json`
- Files persist between server restarts
- You can manually inspect or delete these files

## Configuration Options

Edit `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `local` | Must be "local" for local development |
| `API_HOST` | `0.0.0.0` | Server host (use 0.0.0.0 to allow external access) |
| `API_PORT` | `8000` | Server port |
| `LOCAL_STORAGE_PATH` | `./local_storage` | Directory for conversation history |
| `LOCAL_PERSONA_PATH` | `./me.txt` | Path to persona file |
| `LLM_PROVIDER` | `openai` | LLM provider (openai or bedrock) |
| `LLM_MODEL` | `gpt-4` | Model to use |
| `LLM_MAX_TOKENS` | `2000` | Maximum tokens in response |
| `LLM_TEMPERATURE` | `0.7` | Response creativity (0.0-1.0) |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

## Troubleshooting

### Server won't start
- Check that port 8000 is not already in use
- Verify Python version: `python --version` (should be 3.11+)
- Ensure all dependencies are installed: `pip install -r requirements.txt`

### "Persona file not found" error
- Verify `me.txt` exists in the backend directory
- Check `LOCAL_PERSONA_PATH` in `.env` points to the correct file

### "OpenAI API key not configured" warning
- Edit `.env` and set `OPENAI_API_KEY=your-actual-key`
- Get an API key from https://platform.openai.com/api-keys

### Chat responses fail
- Check the server logs for detailed error messages
- Verify your OpenAI API key is valid and has credits
- Check your internet connection (required for OpenAI API)

### Conversation history not persisting
- Verify `local_storage/` directory exists and is writable
- Check server logs for storage errors
- Ensure you're using the same `session_id` across requests

## Development Tips

1. **Hot Reload**: The server runs with `reload=True`, so code changes automatically restart the server

2. **Debug Logging**: Set `LOG_LEVEL=DEBUG` in `.env` for detailed logs

3. **Test Different Personas**: Create multiple persona files and switch between them by updating `LOCAL_PERSONA_PATH`

4. **Clear History**: Delete files in `local_storage/` to start fresh

5. **API Testing**: Use the interactive docs at http://localhost:8000/docs to test endpoints

## Next Steps

- Customize `me.txt` with your actual persona
- Test the chat functionality with various messages
- Review the API documentation
- Explore the codebase to understand the architecture

## Requirements Validated

This local development setup satisfies:
- **Requirement 4.1**: FastAPI backend starts on configurable local port
- **Requirement 4.4**: Persona file loaded from local filesystem
- **Requirement 4.5**: Environment variables indicate local mode, bypassing AWS authentication
