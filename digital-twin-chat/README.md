# Digital Twin Chat Application

A full-stack serverless conversational AI application that provides a chat interface powered by a user's persona. The system enables users to interact with an AI that speaks and acts as their digital representation, with persistent memory across sessions.

## Project Structure

```
digital-twin-chat/
├── frontend/          # Next.js frontend application
├── backend/           # FastAPI backend application
└── infrastructure/    # AWS infrastructure as code (to be added)
```

## Features

- 🤖 AI-powered chat interface mimicking user persona
- 💾 Persistent conversation memory across sessions
- 🔒 Secure credential management with AWS Secrets Manager
- ☁️ Serverless deployment on AWS (Lambda, S3, CloudFront)
- 🚀 Local development environment
- 📝 Customizable persona via text file

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- AWS Account (for production deployment)

### Local Development

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Copy the example environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Customize your persona:
   ```bash
   # Edit backend/me.txt with your persona information
   ```

5. Run the backend server:
   ```bash
   python main.py
   ```

   The API will be available at `http://localhost:8000`

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and configure:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## Architecture

- **Frontend**: Next.js with App Router, deployed as static site to S3/CloudFront
- **Backend**: FastAPI on AWS Lambda with API Gateway
- **Storage**: S3 for conversation memory and persona file
- **Security**: AWS Secrets Manager for API keys, IAM for access control
- **Monitoring**: CloudWatch for logs and metrics

## Development

### Backend API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/chat` - Send message and get response
- `GET /api/chat/history/{session_id}` - Retrieve conversation history

### Testing

Backend tests:
```bash
cd backend
pytest
```

Frontend tests:
```bash
cd frontend
npm test
```

## Deployment

Deployment instructions will be added as infrastructure code is implemented.

## License

MIT
