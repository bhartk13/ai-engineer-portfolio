# Digital Twin Chat - Configuration Guide

## Current Issue

The Lambda function environment variable is named `LLM_API_KEY_SECRET_NAME` but the code expects `SECRETS_MANAGER_SECRET_NAME`.

## Solution: Two Options

### Option 1: Update Lambda Environment Variable (Recommended)

Update the Lambda environment variable to match what the code expects:

```bash
aws lambda update-function-configuration \
  --function-name DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg \
  --environment "Variables={
    ENVIRONMENT=staging,
    LOG_LEVEL=DEBUG,
    S3_MEMORY_BUCKET=digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm,
    S3_PERSONA_BUCKET=digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm,
    SECRETS_MANAGER_SECRET_NAME=digital-twin-chat/staging/llm-api-key
  }"
```

### Option 2: Update the Code

Modify `digital-twin-chat/backend/secrets_manager.py` line 22 to read from the correct environment variable:

```python
# Change from:
self.secret_name = os.getenv("SECRETS_MANAGER_SECRET_NAME", "")

# To:
self.secret_name = os.getenv("LLM_API_KEY_SECRET_NAME", os.getenv("SECRETS_MANAGER_SECRET_NAME", ""))
```

## Step-by-Step Configuration

### Step 1: Fix the Environment Variable

Run Option 1 command above to update the Lambda configuration.

### Step 2: Create the Secret in AWS Secrets Manager

The secret needs to be in JSON format with an `openai_api_key` field:

```bash
aws secretsmanager create-secret \
  --name digital-twin-chat/staging/llm-api-key \
  --description "OpenAI API key for Digital Twin Chat staging" \
  --secret-string '{"openai_api_key":"YOUR_OPENAI_API_KEY_HERE"}'
```

**Or if the secret already exists, update it:**

```bash
aws secretsmanager put-secret-value \
  --secret-id digital-twin-chat/staging/llm-api-key \
  --secret-string '{"openai_api_key":"YOUR_OPENAI_API_KEY_HERE"}'
```

**Replace `YOUR_OPENAI_API_KEY_HERE` with your actual OpenAI API key.**

### Step 3: Upload Your Persona File

Upload the `me.txt` file that describes your digital twin:

```bash
aws s3 cp digital-twin-chat/backend/me.txt \
  s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/me.txt
```

**Or if you want to use the LinkedIn PDF:**

```bash
aws s3 cp digital-twin-chat/backend/linkedin.pdf \
  s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/linkedin.pdf
```

### Step 4: Test the API

After completing the above steps, test the health endpoint:

```bash
curl https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/health
```

Expected response:
```json
{"status":"healthy","version":"1.0.0"}
```

Test the chat endpoint:

```bash
curl -X POST https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, who are you?"}'
```

### Step 5: Access the Frontend

Open your browser and navigate to:
```
https://dgc2cjdjejel3.cloudfront.net
```

## Verification Checklist

- [ ] Lambda environment variable `SECRETS_MANAGER_SECRET_NAME` is set
- [ ] Secret exists in AWS Secrets Manager with correct JSON format
- [ ] Persona file is uploaded to S3
- [ ] Health endpoint returns 200 OK
- [ ] Chat endpoint responds with AI-generated text
- [ ] Frontend loads and can send messages

## Troubleshooting

### Check Lambda Logs

```bash
aws logs tail /aws/lambda/DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg --follow
```

### Verify Secret Exists

```bash
aws secretsmanager describe-secret --secret-id digital-twin-chat/staging/llm-api-key
```

### Check S3 Files

```bash
aws s3 ls s3://digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm/
```

### Common Issues

1. **"SECRETS_MANAGER_SECRET_NAME not configured"**
   - Solution: Run Step 1 to update the Lambda environment variable

2. **"Secret not found in Secrets Manager"**
   - Solution: Run Step 2 to create the secret

3. **"Key 'openai_api_key' not found in secret"**
   - Solution: Ensure the secret is in JSON format: `{"openai_api_key":"sk-..."}`

4. **"Persona file not found"**
   - Solution: Run Step 3 to upload the persona file

## Environment Variables Reference

### Lambda Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `ENVIRONMENT` | `staging` | Deployment environment |
| `LOG_LEVEL` | `DEBUG` | Logging verbosity |
| `S3_MEMORY_BUCKET` | `digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm` | S3 bucket for conversation memory |
| `S3_PERSONA_BUCKET` | `digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm` | S3 bucket for persona files |
| `SECRETS_MANAGER_SECRET_NAME` | `digital-twin-chat/staging/llm-api-key` | Name of the secret in Secrets Manager |

### Secret Format

The secret in AWS Secrets Manager must be JSON:

```json
{
  "openai_api_key": "sk-proj-..."
}
```

## Next Steps

After configuration is complete:

1. Test the application thoroughly
2. Set up monitoring and alerts
3. Configure production environment
4. Set up CI/CD pipeline for automated deployments
