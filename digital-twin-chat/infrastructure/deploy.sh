#!/bin/bash
# Deployment script for Digital Twin Chat infrastructure

set -e

# Default values
ENV=${1:-dev}
ACCOUNT=${2:-}
REGION=${3:-us-east-1}

echo "Deploying Digital Twin Chat infrastructure..."
echo "Environment: $ENV"
echo "Region: $REGION"

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Bootstrap CDK if needed (first time only)
if [ -n "$ACCOUNT" ]; then
    echo "Bootstrapping CDK (if not already done)..."
    cdk bootstrap aws://$ACCOUNT/$REGION
fi

# Synthesize CloudFormation template
echo "Synthesizing CloudFormation template..."
cdk synth --context env=$ENV --context region=$REGION

# Deploy stack
echo "Deploying stack..."
if [ -n "$ACCOUNT" ]; then
    cdk deploy --context env=$ENV --context account=$ACCOUNT --context region=$REGION --require-approval never
else
    cdk deploy --context env=$ENV --context region=$REGION --require-approval never
fi

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set the LLM API key in Secrets Manager:"
echo "   aws secretsmanager put-secret-value --secret-id digital-twin-chat/$ENV/llm-api-key --secret-string 'YOUR_API_KEY'"
echo ""
echo "2. Upload persona file to S3:"
echo "   aws s3 cp ../backend/me.txt s3://MEMORY_BUCKET_NAME/me.txt"
echo ""
echo "3. Build and deploy frontend:"
echo "   cd ../frontend && npm run build && aws s3 sync out/ s3://FRONTEND_BUCKET_NAME/"
echo ""
echo "4. Invalidate CloudFront cache:"
echo "   aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths '/*'"
