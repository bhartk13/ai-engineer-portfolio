# Deployment Scripts Guide

This directory contains comprehensive deployment and rollback scripts for the Digital Twin Chat application. These scripts automate the deployment process for both infrastructure and application components.

## Overview

The deployment process is split into three main scripts:

1. **Infrastructure Deployment** - Deploys AWS infrastructure using CDK
2. **Application Deployment** - Builds and deploys backend (Lambda) and frontend (S3/CloudFront)
3. **Rollback** - Rolls back to previous versions in case of issues

## Prerequisites

### Required Tools

- **AWS CLI** - For interacting with AWS services
  - Install: https://aws.amazon.com/cli/
  - Configure: `aws configure`

- **AWS CDK** - For infrastructure deployment
  - Install: `npm install -g aws-cdk`

- **Python 3.11+** - For backend code
  - Install: https://www.python.org/downloads/

- **Node.js 18+** - For frontend build
  - Install: https://nodejs.org/

- **jq** (Linux/macOS only) - For JSON parsing
  - Linux: `sudo apt-get install jq`
  - macOS: `brew install jq`

### AWS Configuration

Ensure your AWS credentials are configured:

```bash
aws configure
```

You'll need:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)

## Script Descriptions

### 1. Infrastructure Deployment

**Purpose**: Deploys or updates the AWS infrastructure stack including S3 buckets, Lambda function, API Gateway, CloudFront, and monitoring resources.

**Scripts**:
- `deploy-infrastructure.sh` (Linux/macOS)
- `deploy-infrastructure.bat` (Windows)

**Features**:
- Environment validation (staging/production)
- Prerequisite checking
- CDK bootstrapping (if needed)
- Stack synthesis and deployment
- Smoke tests after deployment
- Output extraction for subsequent deployments

**Usage**:

```bash
# Linux/macOS
./deploy-infrastructure.sh <staging|production> [region] [account]

# Windows
deploy-infrastructure.bat <staging|production> [region] [account]

# Examples
./deploy-infrastructure.sh staging us-east-1
./deploy-infrastructure.sh production us-east-1 123456789012
```

**What it does**:
1. Validates environment parameter
2. Checks for required tools (AWS CLI, CDK, Python)
3. Installs Python dependencies
4. Bootstraps CDK (if account provided)
5. Synthesizes CloudFormation template
6. Deploys infrastructure stack
7. Extracts deployment outputs to `outputs-<env>.json`
8. Runs smoke tests:
   - Lambda function exists
   - API Gateway health endpoint responds
   - S3 buckets are accessible
9. Displays post-deployment instructions

**Outputs**:
- `outputs-<env>.json` - Contains resource names and endpoints
- CloudFormation stack in AWS
- All infrastructure resources created

### 2. Application Deployment

**Purpose**: Builds and deploys the application code (backend Lambda function and frontend static files).

**Scripts**:
- `deploy-application.sh` (Linux/macOS)
- `deploy-application.bat` (Windows)

**Features**:
- Lambda function packaging and deployment
- Frontend build and S3 upload
- CloudFront cache invalidation
- Persona file upload (if missing)
- Post-deployment testing

**Usage**:

```bash
# Linux/macOS
./deploy-application.sh <staging|production>

# Windows
deploy-application.bat <staging|production>

# Examples
./deploy-application.sh staging
./deploy-application.sh production
```

**What it does**:
1. Loads deployment outputs from infrastructure deployment
2. **Backend Deployment**:
   - Creates Lambda deployment package
   - Installs Python dependencies
   - Zips application code
   - Updates Lambda function code
   - Waits for function to be updated
3. **Frontend Deployment**:
   - Installs Node.js dependencies (if needed)
   - Sets API endpoint environment variable
   - Builds Next.js static export
   - Syncs files to S3 with appropriate cache headers
   - Static assets: 1 year cache
   - HTML files: no cache
4. **CloudFront**:
   - Looks up distribution ID
   - Creates cache invalidation
   - Waits for invalidation to complete
5. **Persona File**:
   - Checks if me.txt exists in S3
   - Uploads from backend/me.txt if missing
6. **Post-Deployment Tests**:
   - Lambda function accessibility
   - API health endpoint
   - Frontend files in S3
   - CloudFront distribution

**Outputs**:
- Updated Lambda function
- Frontend files in S3
- CloudFront cache invalidated
- Deployment summary with URLs

### 3. Rollback

**Purpose**: Rolls back the application to a previous version in case of deployment issues.

**Scripts**:
- `rollback.sh` (Linux/macOS)
- `rollback.bat` (Windows)

**Features**:
- Lambda version rollback using aliases
- S3 file restoration (if versioning enabled)
- CloudFront cache invalidation
- Rollback verification

**Usage**:

```bash
# Linux/macOS
./rollback.sh <staging|production> [lambda-version]

# Windows
rollback.bat <staging|production> [lambda-version]

# Examples
./rollback.sh staging 3
./rollback.sh production  # Will prompt for version
```

**What it does**:
1. Loads deployment outputs
2. Gets current Lambda version
3. Lists available Lambda versions (if not specified)
4. Prompts for confirmation
5. **Lambda Rollback**:
   - Verifies target version exists
   - Updates or creates 'live' alias pointing to target version
6. **S3 Rollback** (optional):
   - Checks if versioning is enabled
   - Offers to restore from backup (if available)
   - Manual restoration guidance
7. **CloudFront**:
   - Invalidates cache to reflect rollback
8. **Verification**:
   - Confirms Lambda version
   - Tests Lambda accessibility
9. Displays rollback summary

**Important Notes**:
- Lambda rollback uses version aliases
- S3 rollback requires versioning to be enabled
- Manual S3 file restoration may be needed
- Always test after rollback

## Deployment Workflow

### Initial Deployment

1. **Deploy Infrastructure**:
   ```bash
   ./deploy-infrastructure.sh staging us-east-1
   ```

2. **Set Secrets** (one-time):
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id digital-twin-chat/staging/llm-api-key \
     --secret-string 'your-api-key-here'
   ```

3. **Deploy Application**:
   ```bash
   ./deploy-application.sh staging
   ```

4. **Verify Deployment**:
   - Open the CloudFront URL
   - Test the chat interface
   - Check CloudWatch logs

### Updating Application

To deploy code changes:

```bash
./deploy-application.sh staging
```

This updates both backend and frontend without touching infrastructure.

### Updating Infrastructure

To update infrastructure (e.g., add resources, change configurations):

```bash
./deploy-infrastructure.sh staging us-east-1
```

Then redeploy the application:

```bash
./deploy-application.sh staging
```

### Rolling Back

If a deployment causes issues:

```bash
# List versions and select one
./rollback.sh staging

# Or specify version directly
./rollback.sh staging 3
```

## Environment-Specific Considerations

### Staging Environment

- Used for testing and validation
- Can be deployed frequently
- Lower cost resources acceptable
- Automated deployments recommended

### Production Environment

- Requires manual approval (recommended)
- Should have monitoring and alarms configured
- Use blue-green or canary deployments for zero-downtime
- Always test in staging first
- Have rollback plan ready

## Troubleshooting

### Infrastructure Deployment Fails

**Issue**: CDK deployment fails

**Solutions**:
- Check AWS credentials: `aws sts get-caller-identity`
- Verify CDK is bootstrapped: `cdk bootstrap`
- Check CloudFormation console for detailed errors
- Ensure no resource name conflicts

### Application Deployment Fails

**Issue**: Lambda update fails

**Solutions**:
- Check Lambda function exists
- Verify deployment package size (< 50MB)
- Check Lambda execution role permissions
- Review CloudWatch logs

**Issue**: Frontend build fails

**Solutions**:
- Ensure Node.js dependencies are installed
- Check for TypeScript errors
- Verify environment variables are set
- Review build logs

### Rollback Issues

**Issue**: Cannot find previous versions

**Solutions**:
- Lambda versions are created automatically on publish
- Check Lambda console for version history
- Ensure versions weren't deleted

**Issue**: S3 rollback not working

**Solutions**:
- Enable S3 versioning on the bucket
- Use AWS Console to restore specific file versions
- Consider implementing backup strategy

## Best Practices

1. **Always Deploy to Staging First**
   - Test thoroughly in staging
   - Verify all functionality works
   - Check logs for errors

2. **Use Version Control**
   - Tag releases in Git
   - Match Lambda versions to Git tags
   - Document changes in commit messages

3. **Monitor Deployments**
   - Watch CloudWatch logs during deployment
   - Set up alarms for errors
   - Use CloudWatch dashboards

4. **Backup Before Major Changes**
   - Create Lambda version snapshots
   - Enable S3 versioning
   - Document current state

5. **Test Rollback Procedures**
   - Practice rollback in staging
   - Verify rollback works quickly
   - Document rollback steps

6. **Automate Where Possible**
   - Use CI/CD pipelines
   - Automate testing
   - Implement deployment gates

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

### GitHub Actions Example

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy Application
        run: |
          cd infrastructure
          ./deploy-application.sh staging
```

## Security Considerations

1. **Credentials**:
   - Never commit AWS credentials
   - Use IAM roles where possible
   - Rotate credentials regularly

2. **Secrets**:
   - Store API keys in Secrets Manager
   - Never hardcode secrets
   - Use environment-specific secrets

3. **Permissions**:
   - Follow least privilege principle
   - Review IAM policies regularly
   - Audit access logs

4. **Network**:
   - Use HTTPS only
   - Enable CloudFront security features
   - Configure WAF rules (optional)

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review CloudFormation events
3. Consult AWS documentation
4. Check the main README.md

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Deployment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-deploy-functions.html)
- [CloudFront Cache Invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
- [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
