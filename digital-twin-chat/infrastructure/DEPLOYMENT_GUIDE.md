# Digital Twin Chat - Deployment Guide

This guide walks through deploying the Digital Twin Chat application to AWS using CDK.

## Prerequisites

1. **AWS Account**: Active AWS account with appropriate permissions
2. **AWS CLI**: Installed and configured with credentials
   ```bash
   aws configure
   ```
3. **Node.js**: Version 18+ for CDK CLI
4. **Python**: Version 3.11+ for CDK app
5. **CDK CLI**: Install globally
   ```bash
   npm install -g aws-cdk
   ```

## Initial Setup

### 1. Install Dependencies

```bash
cd infrastructure

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Bootstrap CDK (First Time Only)

Bootstrap CDK in your AWS account and region:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

Example:
```bash
cdk bootstrap aws://123456789012/us-east-1
```

## Deployment

### Deploy to Development

```bash
# Using deployment script (recommended)
./deploy.sh dev

# Or manually
cdk deploy --context env=dev
```

### Deploy to Staging

```bash
./deploy.sh staging YOUR-ACCOUNT-ID us-east-1
```

### Deploy to Production

```bash
./deploy.sh prod YOUR-ACCOUNT-ID us-east-1
```

## Post-Deployment Configuration

After deployment, complete these steps:

### 1. Set LLM API Key in Secrets Manager

```bash
aws secretsmanager put-secret-value \
  --secret-id digital-twin-chat/ENV/llm-api-key \
  --secret-string 'YOUR_OPENAI_OR_BEDROCK_API_KEY'
```

Replace `ENV` with your environment (dev, staging, prod).

### 2. Upload Persona File to S3

Get the memory bucket name from CDK outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name DigitalTwinChatStack-ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`MemoryBucketName`].OutputValue' \
  --output text
```

Upload persona file:
```bash
aws s3 cp ../backend/me.txt s3://MEMORY-BUCKET-NAME/me.txt
```

### 3. Build and Deploy Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Build static export
npm run build

# Get frontend bucket name from CDK outputs
aws cloudformation describe-stacks \
  --stack-name DigitalTwinChatStack-ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text

# Upload to S3
aws s3 sync out/ s3://FRONTEND-BUCKET-NAME/ --delete
```

### 4. Invalidate CloudFront Cache

```bash
# Get CloudFront distribution ID
aws cloudformation describe-stacks \
  --stack-name DigitalTwinChatStack-ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
  --output text

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION-ID \
  --paths "/*"
```

## Verify Deployment

### 1. Check Stack Status

```bash
cdk list
cdk diff --context env=ENV
```

### 2. Test API Endpoint

```bash
# Get API endpoint
API_URL=$(aws cloudformation describe-stacks \
  --stack-name DigitalTwinChatStack-ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Test health endpoint
curl $API_URL/api/health
```

Expected response:
```json
{"status":"healthy","version":"0.1.0"}
```

### 3. Test Chat Endpoint

```bash
curl -X POST $API_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, who are you?"}'
```

### 4. Access Frontend

Get CloudFront domain:
```bash
aws cloudformation describe-stacks \
  --stack-name DigitalTwinChatStack-ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
  --output text
```

Open in browser: `https://CLOUDFRONT-DOMAIN`

## Monitoring

### View Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/LAMBDA-FUNCTION-NAME --follow

# Get Lambda function name
aws cloudformation describe-stacks \
  --stack-name DigitalTwinChatStack-ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
  --output text
```

### View CloudWatch Dashboard

1. Go to AWS Console → CloudWatch → Dashboards
2. Open `digital-twin-chat-ENV` dashboard
3. Monitor Lambda invocations, errors, duration, and API metrics

### Check Alarms

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix digital-twin-chat
```

## Updating the Application

### Update Backend Code

```bash
cd infrastructure
cdk deploy --context env=ENV
```

CDK will automatically package and deploy the updated Lambda function.

### Update Frontend

```bash
cd frontend
npm run build
aws s3 sync out/ s3://FRONTEND-BUCKET-NAME/ --delete
aws cloudfront create-invalidation --distribution-id DISTRIBUTION-ID --paths "/*"
```

### Update Infrastructure

```bash
cd infrastructure
# Review changes
cdk diff --context env=ENV

# Deploy changes
cdk deploy --context env=ENV
```

## Rollback

### Rollback Lambda Function

```bash
# List versions
aws lambda list-versions-by-function --function-name FUNCTION-NAME

# Update alias to previous version
aws lambda update-alias \
  --function-name FUNCTION-NAME \
  --name live \
  --function-version PREVIOUS-VERSION
```

### Rollback Infrastructure

```bash
# Rollback via CloudFormation
aws cloudformation cancel-update-stack --stack-name DigitalTwinChatStack-ENV

# Or redeploy previous version
git checkout PREVIOUS-COMMIT
cd infrastructure
cdk deploy --context env=ENV
```

## Cleanup

To remove all resources:

```bash
cd infrastructure
cdk destroy --context env=ENV
```

**Warning**: This will delete all resources including S3 buckets with data. Ensure you have backups if needed.

## Troubleshooting

### CDK Bootstrap Issues

If bootstrap fails, ensure you have the required IAM permissions:
- `cloudformation:*`
- `s3:*`
- `iam:*`
- `ecr:*`

### Lambda Deployment Issues

If Lambda deployment fails:
1. Check that `mangum` is in `backend/requirements.txt`
2. Verify `handler` is correctly defined in `backend/main.py`
3. Check Lambda logs for errors

### CloudFront Issues

If CloudFront doesn't serve content:
1. Verify S3 bucket has files
2. Check OAI permissions
3. Wait 10-15 minutes for distribution to fully deploy
4. Create cache invalidation

### API Gateway Issues

If API returns errors:
1. Check Lambda function logs
2. Verify environment variables are set
3. Test Lambda function directly in AWS Console
4. Check IAM permissions

## Cost Optimization

- Use `cdk destroy` for dev environments when not in use
- Enable S3 Intelligent-Tiering for memory bucket
- Monitor CloudWatch costs and adjust retention periods
- Use API Gateway caching for frequently accessed endpoints

## Security Best Practices

1. **Secrets**: Never commit secrets to git
2. **IAM**: Review and minimize permissions regularly
3. **Logging**: Enable CloudTrail for audit logs
4. **Encryption**: Verify all data is encrypted at rest and in transit
5. **Updates**: Keep CDK and dependencies updated

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review CDK synthesis output: `cdk synth`
3. Validate IAM permissions
4. Check AWS service quotas
