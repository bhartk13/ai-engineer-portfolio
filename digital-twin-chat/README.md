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

The application is deployed to AWS using CDK (Cloud Development Kit) with automated scripts for both infrastructure and application deployment.

### Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Python 3.12+ for Lambda compatibility
- Node.js 18+ for frontend build
- OpenAI API key

### Deployment Steps

#### 1. Deploy Infrastructure

Deploy the AWS infrastructure (Lambda, API Gateway, S3, CloudFront, etc.):

```bash
cd infrastructure
./deploy-infrastructure.bat staging  # Windows
# or
./deploy-infrastructure.sh staging   # Linux/Mac
```

This creates:
- Lambda function for backend API
- API Gateway for HTTP endpoints
- S3 buckets for frontend and memory storage
- CloudFront distribution for CDN
- IAM roles and policies
- CloudWatch log groups

#### 2. Configure Secrets

Set up your OpenAI API key in AWS Secrets Manager:

```bash
cd digital-twin-chat
./setup-secrets.bat YOUR_OPENAI_API_KEY  # Windows
```

Or manually:
```bash
aws secretsmanager create-secret \
  --name digital-twin-chat/staging/llm-api-key \
  --secret-string '{"openai_api_key":"YOUR_OPENAI_API_KEY"}'
```

#### 3. Deploy Application

Build and deploy both backend and frontend:

```bash
cd infrastructure
./deploy-application.bat staging  # Windows
# or
./deploy-application.sh staging   # Linux/Mac
```

This will:
- Build Lambda package with Linux ARM64 binaries
- Deploy backend code to Lambda
- Build Next.js frontend
- Upload frontend to S3
- Invalidate CloudFront cache
- Upload persona file to S3

#### 4. Access Your Application

After deployment completes, you'll receive:
- **Frontend URL**: `https://[cloudfront-domain].cloudfront.net`
- **API Endpoint**: `https://[api-id].execute-api.us-east-1.amazonaws.com`

### Deployment Architecture

```
┌─────────────┐
│  CloudFront │ ← Frontend (Next.js static site)
└──────┬──────┘
       │
┌──────▼──────┐
│     S3      │ ← Static assets
└─────────────┘

┌─────────────┐
│ API Gateway │ ← REST API
└──────┬──────┘
       │
┌──────▼──────┐
│   Lambda    │ ← FastAPI backend (Python 3.12, ARM64)
└──────┬──────┘
       │
       ├─────► S3 (Conversation memory)
       ├─────► S3 (Persona file)
       └─────► Secrets Manager (API keys)
```

### Environment-Specific Deployments

Deploy to different environments:

```bash
# Staging
./deploy-infrastructure.bat staging
./deploy-application.bat staging

# Production
./deploy-infrastructure.bat production
./deploy-application.bat production
```

### Rollback

If you need to rollback a deployment:

```bash
cd infrastructure
./rollback.bat staging  # Windows
# or
./rollback.sh staging   # Linux/Mac
```

### Monitoring and Logs

View Lambda logs:
```bash
aws logs tail /aws/lambda/[function-name] --follow
```

View CloudWatch metrics in AWS Console:
- Lambda invocations, errors, duration
- API Gateway requests, latency, errors
- CloudFront cache hit ratio

### Troubleshooting

See detailed troubleshooting guides:
- [Configuration Guide](CONFIGURATION_GUIDE.md) - Setup and configuration
- [Lambda Deployment Fix](LAMBDA_DEPLOYMENT_FIX.md) - Binary compatibility issues
- [CORS Fix](CORS_FIX.md) - CORS configuration
- [Deployment Guide](infrastructure/DEPLOYMENT_GUIDE.md) - Detailed deployment steps

### CI/CD

Automated deployments are configured via GitHub Actions:
- See [CI/CD Guide](CI_CD_GUIDE.md) for setup instructions
- Workflows defined in `.github/workflows/ci-cd.yml`

### Cost Estimation

Estimated monthly costs for staging environment with moderate usage:
- Lambda: ~$5-10 (1M requests)
- API Gateway: ~$3.50 (1M requests)
- S3: ~$1 (storage + requests)
- CloudFront: ~$1 (1GB transfer)
- Secrets Manager: ~$0.40
- **Total: ~$10-15/month**

Production costs scale with usage. Use AWS Cost Explorer for accurate tracking.

## License

MIT
