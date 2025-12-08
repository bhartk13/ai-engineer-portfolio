# Digital Twin Chat - Infrastructure

This directory contains AWS CDK infrastructure code for deploying the Digital Twin Chat application.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Python 3.11+
- Node.js 18+ (for CDK CLI)
- AWS CDK CLI installed: `npm install -g aws-cdk`

## Setup

1. Create a virtual environment:
```bash
python -m venv .venv
```

2. Activate the virtual environment:
```bash
# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Project Structure

```
infrastructure/
├── app.py                      # CDK app entry point
├── cdk.json                    # CDK configuration
├── requirements.txt            # Python dependencies
├── stacks/
│   ├── digital_twin_stack.py  # Main stack definition
│   └── constructs/             # Reusable CDK constructs
│       ├── storage.py          # S3 buckets
│       ├── compute.py          # Lambda function
│       ├── api.py              # API Gateway
│       ├── cdn.py              # CloudFront distribution
│       ├── secrets.py          # Secrets Manager
│       └── monitoring.py       # CloudWatch monitoring
```

## Deployment

### Deploy to Development
```bash
cdk deploy --context env=dev
```

### Deploy to Staging
```bash
cdk deploy --context env=staging
```

### Deploy to Production
```bash
cdk deploy --context env=prod
```

### Specify AWS Account and Region
```bash
cdk deploy --context env=prod --context account=123456789012 --context region=us-east-1
```

## Useful Commands

- `cdk ls` - List all stacks
- `cdk synth` - Synthesize CloudFormation template
- `cdk diff` - Compare deployed stack with current state
- `cdk deploy` - Deploy stack to AWS
- `cdk destroy` - Remove stack from AWS
- `cdk bootstrap` - Bootstrap CDK in your AWS account (first time only)

## Bootstrap CDK (First Time Only)

Before deploying for the first time, bootstrap CDK in your AWS account:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

## Environment Variables

The stack uses the following context variables:

- `env`: Environment name (dev, staging, prod)
- `account`: AWS account ID (optional, uses default from AWS CLI)
- `region`: AWS region (optional, defaults to us-east-1)

## Outputs

After deployment, the stack outputs:

- `FrontendBucketName`: S3 bucket for frontend static files
- `MemoryBucketName`: S3 bucket for conversation storage
- `ApiEndpoint`: API Gateway endpoint URL
- `CloudFrontDomain`: CloudFront distribution domain
- `LambdaFunctionName`: Lambda function name

## Security

- All S3 buckets use encryption at rest (SSE-S3)
- IAM policies follow least privilege principle
- Secrets stored in AWS Secrets Manager with KMS encryption
- HTTPS enforced on all endpoints
- CloudWatch logging enabled for all resources

## Cost Optimization

- Lambda uses ARM64 architecture for better price/performance
- S3 uses Intelligent-Tiering for automatic cost optimization
- CloudFront caching reduces origin requests
- API Gateway HTTP API (lower cost than REST API)

## Monitoring

The stack creates:

- CloudWatch Log Groups for Lambda
- CloudWatch Alarms for error rates and latency
- CloudWatch Dashboard for system health visualization

## Cleanup

To remove all resources:

```bash
cdk destroy --context env=dev
```

**Note**: S3 buckets with content may require manual deletion or setting `RemovalPolicy.DESTROY` with `auto_delete_objects=True`.
