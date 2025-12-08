# Setup Guide

This guide will help you set up the Digital Twin Chat application for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Git**

## Initial Setup

### 1. Backend Setup

Navigate to the backend directory and set up the Python environment:

```bash
cd backend
```

#### Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# For local development, the defaults should work
```

#### Customize Your Persona

Edit the `me.txt` file with your persona information:

```bash
# Open me.txt in your favorite editor
notepad me.txt  # Windows
nano me.txt     # macOS/Linux
```

Add information about:
- Your professional background
- Your communication style
- Your areas of expertise
- Your personality traits

### 2. Frontend Setup

Navigate to the frontend directory:

```bash
cd ../frontend
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local if needed
# For local development, the defaults should work
```

## Running the Application

### Option 1: Use the Start Script (Recommended)

**Windows:**
```bash
# From the root directory
start-local.bat
```

**macOS/Linux:**
```bash
# From the root directory
chmod +x start-local.sh
./start-local.sh
```

### Option 2: Start Services Manually

**Terminal 1 - Backend:**
```bash
cd backend
python run_local.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Accessing the Application

Once both services are running:

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

## Testing the Setup

1. Open http://localhost:8000/docs in your browser
2. Try the `/api/health` endpoint - it should return `{"status": "healthy", "version": "0.1.0"}`
3. Open http://localhost:3000 in your browser
4. You should see the Next.js welcome page

## Next Steps

After completing the setup:

1. Implement the chat components (Task 2+)
2. Configure your LLM provider (OpenAI or AWS Bedrock)
3. Add your API keys to the `.env` file
4. Start building the chat functionality

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Change the port in backend/.env
API_PORT=8001
```

**Module not found errors:**
```bash
# Ensure virtual environment is activated and dependencies are installed
pip install -r requirements.txt
```

### Frontend Issues

**Port 3000 already in use:**
```bash
# Next.js will automatically suggest port 3001
# Or set a custom port:
npm run dev -- -p 3001
```

**Module not found errors:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

1. Make changes to your code
2. Backend: FastAPI will auto-reload on file changes
3. Frontend: Next.js will hot-reload on file changes
4. Test your changes in the browser
5. Run tests: `pytest` (backend) or `npm test` (frontend)

## Environment Variables Reference

### Backend (.env)

- `ENVIRONMENT`: Set to `local` for development
- `API_HOST`: Host to bind the API server (default: 0.0.0.0)
- `API_PORT`: Port for the API server (default: 8000)
- `LOCAL_PERSONA_PATH`: Path to persona file (default: ./me.txt)
- `LOG_LEVEL`: Logging level (default: INFO)

### Frontend (.env.local)

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8000)
- `NEXT_PUBLIC_ENVIRONMENT`: Environment name (default: local)

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Project README](./README.md)
