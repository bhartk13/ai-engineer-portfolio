# Infrastructure Verification Checklist

This document provides a checklist to verify the infrastructure implementation.

## Pre-Deployment Verification

### Code Structure
- [x] `app.py` exists and is valid Python
- [x] `cdk.json` configured correctly
- [x] `requirements.txt` includes aws-cdk-lib and constructs
- [x] All construct files in `stacks/constructs/` are present
- [x] Deployment scripts (`deploy.sh`, `deploy.bat`) are executable

### CDK Synthesis
Run these commands to verify CDK can synthesize the stack:

```bash
cd infrastructure
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cdk synth --context env=dev
```

Expected: CloudFormation template generated without errors

### Python Syntax
Verify all Python files compile:

```bash
python -m py_compile app.py
python -m py_compile stacks/digital_twin_stack.py
python -m py_compile stacks/constructs/*.py
```

Expected: No syntax errors

## Post-Deployment Verification

### Stack Deployment
```bash
aws cloudformation describe-stacks --stack-name DigitalTwinChatStack-dev
```

Expected: Stack status is `CREATE_COMPLETE` or `UPDATE_COMPLETE`

### S3 Buckets
```bash
# List buckets
aws s3 ls | grep digital-twin

# Check encryption
aws s3api get-bucket-encryption --bucket BUCKET-NAME

# Check versioning (memory bucket)
aws s3api get-bucket-versioning --bucket MEMORY-BUCKET-NAME
```

Expected:
- Two buckets created
- Encryption enabled (SSE-S3)
- Versioning enabled on memory bucket

### Lambda Function
```bash
# Get function details
aws lambda get-function --function-name FUNCTION-NAME

# Check environment variables
aws lambda get-function-configuration --function-name FUNCTION-NAME
```

Expected:
- Runtime: python3.11
- Memory: 1024 MB
- Timeout: 30 seconds
- Architecture: arm64
- Environment variables set

### IAM Role
```bash
# Get role
aws iam get-role --role-name ROLE-NAME

# List attached policies
aws iam list-attached-role-policies --role-name ROLE-NAME

# Get inline policies
aws iam list-role-policies --role-name ROLE-NAME
```

Expected:
- Role exists with Lambda trust policy
- Policies attached for CloudWatch, S3, Secrets Manager, Bedrock
- No wildcard permissions in policy documents

### API Gateway
```bash
# List APIs
aws apigatewayv2 get-apis

# Get API details
aws apigatewayv2 get-api --api-id API-ID

# Test health endpoint
curl https://API-URL/api/health
```

Expected:
- HTTP API created
- CORS configured
- Health endpoint returns `{"status":"healthy","version":"0.1.0"}`

### CloudFront Distribution
```bash
# List distributions
aws cloudfront list-distributions

# Get distribution details
aws cloudfront get-distribution --id DISTRIBUTION-ID
```

Expected:
- Distribution created and deployed
- HTTPS enforced
- TLS 1.2 minimum
- S3 origin configured with OAI

### Secrets Manager
```bash
# List secrets
aws secretsmanager list-secrets

# Get secret metadata
aws secretsmanager describe-secret --secret-id digital-twin-chat/dev/llm-api-key
```

Expected:
- Secret exists
- KMS encryption enabled
- No value set yet (must be set manually)

### CloudWatch
```bash
# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/

# List alarms
aws cloudwatch describe-alarms --alarm-name-prefix digital-twin-chat

# List dashboards
aws cloudwatch list-dashboards
```

Expected:
- Log group for Lambda function
- 5 alarms created (Lambda errors, duration, throttles, API 4xx, API 5xx)
- Dashboard created

## Functional Testing

### 1. Test Lambda Function Directly
```bash
aws lambda invoke \
  --function-name FUNCTION-NAME \
  --payload '{"rawPath":"/api/health","requestContext":{"http":{"method":"GET"}}}' \
  response.json

cat response.json
```

Expected: `{"status":"healthy","version":"0.1.0"}`

### 2. Test API Gateway
```bash
# Health check
curl https://API-URL/api/health

# Chat endpoint (will fail without secrets configured)
curl -X POST https://API-URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

Expected:
- Health check returns 200 OK
- Chat endpoint returns error about missing secrets (expected before configuration)

### 3. Test CloudFront
```bash
# Access CloudFront domain
curl -I https://CLOUDFRONT-DOMAIN/

# Check HTTPS redirect
curl -I http://CLOUDFRONT-DOMAIN/
```

Expected:
- HTTPS returns 200 or 403 (if no files uploaded yet)
- HTTP redirects to HTTPS (301/302)

### 4. Test S3 Access
```bash
# Upload test file to memory bucket
echo "test" > test.txt
aws s3 cp test.txt s3://MEMORY-BUCKET-NAME/test.txt

# Verify upload
aws s3 ls s3://MEMORY-BUCKET-NAME/

# Check versioning
aws s3api list-object-versions --bucket MEMORY-BUCKET-NAME --prefix test.txt
```

Expected:
- File uploaded successfully
- Version ID returned

## Security Verification

### IAM Least Privilege
```bash
# Get Lambda role policy
aws iam get-role-policy --role-name ROLE-NAME --policy-name POLICY-NAME
```

Verify:
- [ ] No wildcard (*) in Resource fields
- [ ] Specific bucket ARNs only
- [ ] Specific secret ARNs only
- [ ] Specific Bedrock model ARNs only

### HTTPS Enforcement
```bash
# Test HTTP to HTTPS redirect
curl -I http://CLOUDFRONT-DOMAIN/

# Check API Gateway
curl -I http://API-URL/api/health
```

Verify:
- [ ] CloudFront redirects HTTP to HTTPS
- [ ] API Gateway enforces HTTPS

### Encryption
```bash
# Check S3 encryption
aws s3api get-bucket-encryption --bucket BUCKET-NAME

# Check Secrets Manager encryption
aws secretsmanager describe-secret --secret-id SECRET-ID
```

Verify:
- [ ] S3 buckets use SSE-S3
- [ ] Secrets use KMS encryption

## Monitoring Verification

### CloudWatch Logs
```bash
# Trigger Lambda and check logs
aws logs tail /aws/lambda/FUNCTION-NAME --follow
```

Verify:
- [ ] Logs appear in CloudWatch
- [ ] Structured JSON format
- [ ] Correlation IDs present

### CloudWatch Alarms
```bash
# Check alarm state
aws cloudwatch describe-alarms --alarm-names \
  digital-twin-chat-lambda-errors-dev \
  digital-twin-chat-lambda-duration-dev \
  digital-twin-chat-api-5xx-dev
```

Verify:
- [ ] Alarms in OK state (or INSUFFICIENT_DATA initially)
- [ ] SNS topic configured for notifications

### CloudWatch Dashboard
Open AWS Console → CloudWatch → Dashboards → `digital-twin-chat-dev`

Verify:
- [ ] Lambda metrics visible
- [ ] API Gateway metrics visible
- [ ] Graphs rendering correctly

## Cost Verification

### Estimate Monthly Costs
```bash
# Check resource counts
aws cloudformation describe-stack-resources --stack-name DigitalTwinChatStack-dev
```

Estimated costs (dev environment, low traffic):
- Lambda: $0-5/month (free tier)
- API Gateway: $0-5/month (free tier)
- S3: $0-2/month
- CloudFront: $0-5/month (free tier)
- Secrets Manager: $0.40/month per secret
- CloudWatch: $0-5/month

Total: ~$5-20/month for dev environment

## Cleanup Verification

To verify cleanup works:

```bash
# Destroy stack
cdk destroy --context env=dev

# Verify resources deleted
aws cloudformation describe-stacks --stack-name DigitalTwinChatStack-dev
```

Expected: Stack not found or DELETE_COMPLETE

**Note**: S3 buckets with RemovalPolicy.RETAIN will not be deleted automatically.

## Troubleshooting

### CDK Synthesis Fails
- Check Python version (3.11+)
- Verify all dependencies installed
- Check for syntax errors in Python files

### Deployment Fails
- Check AWS credentials configured
- Verify IAM permissions
- Check CDK bootstrap completed
- Review CloudFormation events in AWS Console

### Lambda Function Errors
- Check CloudWatch logs
- Verify environment variables set
- Check IAM role permissions
- Verify Mangum installed in requirements.txt

### API Gateway 5xx Errors
- Check Lambda function logs
- Verify Lambda integration configured
- Test Lambda function directly

### CloudFront Not Serving Content
- Wait 10-15 minutes for distribution deployment
- Check S3 bucket has files
- Verify OAI permissions
- Create cache invalidation

## Sign-Off Checklist

Before considering infrastructure complete:

- [ ] All CDK constructs created
- [ ] Stack deploys successfully
- [ ] All AWS resources created
- [ ] IAM policies follow least privilege
- [ ] HTTPS enforced everywhere
- [ ] Encryption enabled on all data stores
- [ ] CloudWatch monitoring configured
- [ ] Alarms created and tested
- [ ] Documentation complete
- [ ] Deployment scripts tested
- [ ] Cleanup tested in dev environment
