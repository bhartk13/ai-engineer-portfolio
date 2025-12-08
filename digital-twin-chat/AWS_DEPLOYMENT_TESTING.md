# AWS Deployment Testing Guide

## Deployment Information

**Stack Name**: DigitalTwinChatStack-staging
**Environment**: staging
**Region**: us-east-1

### Deployed Resources

- **API Endpoint**: https://fm90w0818j.execute-api.us-east-1.amazonaws.com/
- **CloudFront Domain**: https://dgc2cjdjejel3.cloudfront.net
- **Lambda Function**: DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg
- **Frontend Bucket**: digitaltwinchatstack-stag-storagefrontendbucketc06-rm2famvxa4z3
- **Memory Bucket**: digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm

## Prerequisites Before Testing

### 1. Set the LLM API Key

The application needs an API key to work. Set it in AWS Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id digital-twin-chat/staging/llm-api-key \
  --secret-string "YOUR_OPENAI_API_KEY_HERE"
```

**Windows PowerShell**:
```powershell
aws secretsmanager put-secret-value `
  --secret-id digital-twin-chat/staging/llm-api-key `
  --secret-string "YOUR_OPENAI_API_KEY_HERE"
```

### 2. Upload Persona File

Upload your persona file (me.txt) to S3:

```bash
aws s3 cp digital-twin-chat/backend/me.txt s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/me.txt
```

**Windows PowerShell**:
```powershell
aws s3 cp digital-twin-chat\backend\me.txt s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/me.txt
```

### 3. Deploy the Application Code

Now deploy the backend Lambda and frontend:

```bash
cd digital-twin-chat/infrastructure
./deploy-application.sh staging
```

**Windows**:
```cmd
cd digital-twin-chat\infrastructure
deploy-application.bat staging
```

## Testing Steps

### Test 1: API Health Check

Test if the API is responding:

```bash
curl https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

**Windows PowerShell**:
```powershell
Invoke-WebRequest -Uri "https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/health" | Select-Object -Expand Content
```

### Test 2: Send a Chat Message

Test the chat endpoint:

```bash
curl -X POST https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, who are you?"}'
```

**Windows PowerShell**:
```powershell
$body = @{
    message = "Hello, who are you?"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/chat" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | Select-Object -Expand Content
```

**Expected Response**:
```json
{
  "response": "I am your digital twin...",
  "session_id": "some-uuid",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Test 3: Test Conversation History

Use the session_id from the previous response:

```bash
curl https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/chat/history/YOUR_SESSION_ID
```

**Windows PowerShell**:
```powershell
Invoke-WebRequest -Uri "https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/chat/history/YOUR_SESSION_ID" | Select-Object -Expand Content
```

### Test 4: Access Frontend (After Deployment)

Once you deploy the application code, access the frontend:

**CloudFront URL**: https://dgc2cjdjejel3.cloudfront.net

Open this in your browser to use the chat interface.

## Monitoring and Debugging

### View Lambda Logs

```bash
aws logs tail /aws/lambda/DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg --follow
```

### Check Lambda Function Status

```bash
aws lambda get-function --function-name DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg
```

### List S3 Bucket Contents

Check if persona file is uploaded:
```bash
aws s3 ls s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/
```

Check conversation history:
```bash
aws s3 ls s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/ --recursive
```

### Check CloudWatch Metrics

View metrics in AWS Console:
1. Go to CloudWatch → Dashboards
2. Look for "DigitalTwinChat-staging-Dashboard"
3. Monitor Lambda invocations, errors, and duration

## Troubleshooting

### Issue: API Returns 500 Error

**Check**:
1. Is the LLM API key set correctly?
   ```bash
   aws secretsmanager get-secret-value --secret-id digital-twin-chat/staging/llm-api-key
   ```

2. Check Lambda logs for errors:
   ```bash
   aws logs tail /aws/lambda/DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg --since 10m
   ```

### Issue: Persona Not Loading

**Check**:
1. Is me.txt uploaded to S3?
   ```bash
   aws s3 ls s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/me.txt
   ```

2. Check Lambda has permission to read from S3 (should be automatic)

### Issue: Frontend Not Loading

**Check**:
1. Has the frontend been deployed?
   ```bash
   aws s3 ls s3://digitaltwinchatstack-stag-storagefrontendbucketc06-rm2famvxa4z3/
   ```

2. If empty, run the application deployment script

### Issue: CORS Errors

The API Gateway should have CORS configured. If you see CORS errors:
1. Check API Gateway CORS settings in AWS Console
2. Verify the frontend is accessing the correct API endpoint

## Quick Start Commands

Here's the complete sequence to get your app running:

```bash
# 1. Set API key
aws secretsmanager put-secret-value \
  --secret-id digital-twin-chat/staging/llm-api-key \
  --secret-string "YOUR_OPENAI_API_KEY"

# 2. Upload persona
aws s3 cp digital-twin-chat/backend/me.txt \
  s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/me.txt

# 3. Deploy application
cd digital-twin-chat/infrastructure
./deploy-application.sh staging

# 4. Test API
curl https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/health

# 5. Test chat
curl -X POST https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# 6. Open frontend
# Visit: https://dgc2cjdjejel3.cloudfront.net
```

## Next Steps

1. **Set up custom domain** (optional):
   - Configure Route 53 or your DNS provider
   - Point to CloudFront distribution
   - Update ACM certificate

2. **Enable monitoring alerts**:
   - Configure SNS topic for alarm notifications
   - Set up email or Slack notifications

3. **Deploy to production**:
   - Follow same process with `production` environment
   - Use the CI/CD pipeline for automated deployments

4. **Set up CI/CD**:
   - Configure GitHub secrets and environments
   - Push to `develop` branch to trigger staging deployment
   - Push to `main` branch for production (with approval)

## Useful AWS Console Links

- **Lambda Function**: https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg
- **API Gateway**: https://console.aws.amazon.com/apigateway/home?region=us-east-1
- **CloudFront**: https://console.aws.amazon.com/cloudfront/home
- **S3 Buckets**: https://s3.console.aws.amazon.com/s3/home?region=us-east-1
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
- **Secrets Manager**: https://console.aws.amazon.com/secretsmanager/home?region=us-east-1

## Support

If you encounter issues:
1. Check CloudWatch logs first
2. Verify all prerequisites are completed
3. Review the error messages in Lambda logs
4. Check IAM permissions if you see access denied errors
