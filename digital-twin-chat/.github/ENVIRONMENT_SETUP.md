# GitHub Environment Setup Guide

This guide walks you through setting up GitHub environments and secrets for the CI/CD pipeline.

## Prerequisites

- Repository admin access
- AWS credentials with deployment permissions
- Staging and production AWS accounts/environments configured

## Step 1: Configure Repository Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the following secrets:

### Required Repository Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for deployments | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `STAGING_API_URL` | Staging API endpoint URL | `https://api-staging.example.com/` |

### Optional Repository Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `PRODUCTION_API_URL` | Production API endpoint URL | `https://api.example.com/` |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/services/...` |

## Step 2: Create Staging Environment

1. Go to **Settings** > **Environments**
2. Click **New environment**
3. Name it: `staging`
4. Click **Configure environment**

### Staging Environment Configuration

**Protection Rules**:
- ☐ Required reviewers: Leave unchecked (automatic deployment)
- ☐ Wait timer: Leave unchecked
- ☑ Deployment branches: Select "Selected branches" and add `develop`

**Environment Secrets** (optional):
- You can override `STAGING_API_URL` here if needed

**Environment Variables**:
- None required

5. Click **Save protection rules**

## Step 3: Create Production Approval Environment

1. Go to **Settings** > **Environments**
2. Click **New environment**
3. Name it: `production-approval`
4. Click **Configure environment**

### Production Approval Environment Configuration

**Protection Rules**:
- ☑ **Required reviewers**: Add team members who can approve production deployments
  - Click **Add reviewers**
  - Select users or teams
  - Recommended: At least 2 reviewers
- ☐ Wait timer: Optional (e.g., 5 minutes to allow review time)
- ☑ Deployment branches: Select "Selected branches" and add `main`

**Environment Secrets**:
- None required

**Environment Variables**:
- None required

5. Click **Save protection rules**

## Step 4: Create Production Environment

1. Go to **Settings** > **Environments**
2. Click **New environment**
3. Name it: `production`
4. Click **Configure environment**

### Production Environment Configuration

**Protection Rules**:
- ☐ Required reviewers: Leave unchecked (approval handled by production-approval)
- ☐ Wait timer: Leave unchecked
- ☑ Deployment branches: Select "Selected branches" and add `main`

**Environment Secrets** (optional):
- You can add `PRODUCTION_API_URL` here if needed

**Environment Variables**:
- None required

5. Click **Save protection rules**

## Step 5: Configure Branch Protection

### Protect Main Branch

1. Go to **Settings** > **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Configure:
   - ☑ Require a pull request before merging
   - ☑ Require approvals (at least 1)
   - ☑ Require status checks to pass before merging
     - Add: `test-backend`
     - Add: `test-frontend`
   - ☑ Require branches to be up to date before merging
   - ☑ Include administrators (recommended)
5. Click **Create**

### Protect Develop Branch

1. Click **Add branch protection rule**
2. Branch name pattern: `develop`
3. Configure:
   - ☑ Require a pull request before merging
   - ☑ Require approvals (at least 1)
   - ☑ Require status checks to pass before merging
     - Add: `test-backend`
     - Add: `test-frontend`
5. Click **Create**

## Step 6: Verify Configuration

### Test Staging Deployment

1. Create a test branch from `develop`
2. Make a small change (e.g., update README)
3. Push to `develop` branch
4. Go to **Actions** tab
5. Verify:
   - Tests run and pass
   - Build artifacts are created
   - Staging deployment runs automatically
   - Integration tests run

### Test Production Approval Flow

1. Merge `develop` to `main` (via pull request)
2. Go to **Actions** tab
3. Verify:
   - Tests run and pass
   - Build artifacts are created
   - Staging deployment runs
   - Integration tests run
   - Production approval job waits for approval
4. Click on the approval job
5. Click **Review deployments**
6. Select `production-approval`
7. Click **Approve and deploy**
8. Verify production deployment runs

## Step 7: AWS Configuration

### Create IAM User for CI/CD

1. Log into AWS Console
2. Go to **IAM** > **Users**
3. Click **Add users**
4. User name: `github-actions-cicd`
5. Select **Access key - Programmatic access**
6. Click **Next: Permissions**

### Attach Policies

Attach these policies (or create a custom policy with minimal permissions):
- `AWSLambdaFullAccess` (or scoped to specific functions)
- `AmazonS3FullAccess` (or scoped to specific buckets)
- `CloudFrontFullAccess` (or scoped to specific distributions)
- `AWSCloudFormationFullAccess` (for CDK deployments)
- `IAMFullAccess` (for CDK to create roles, or scoped)

### Save Credentials

1. Download the CSV with access key and secret
2. Add these to GitHub repository secrets (Step 1)
3. **Important**: Delete the CSV file securely after adding to GitHub

## Step 8: Initial Infrastructure Deployment

Before the CI/CD pipeline can deploy applications, you need to deploy the infrastructure once:

```bash
cd digital-twin-chat/infrastructure

# Deploy staging infrastructure
./deploy-infrastructure.sh staging

# Deploy production infrastructure
./deploy-infrastructure.sh production
```

This creates:
- S3 buckets
- Lambda functions
- API Gateway
- CloudFront distributions
- IAM roles
- Secrets Manager secrets

After this initial deployment, the CI/CD pipeline can update the application code.

## Troubleshooting

### "Environment not found" Error

- Verify environment names match exactly: `staging`, `production-approval`, `production`
- Check environment is configured in repository settings

### "Required reviewers not met" Error

- Verify reviewers are added to `production-approval` environment
- Check reviewers have repository access
- Ensure reviewers are not the same as the person who triggered the workflow

### "AWS credentials not configured" Error

- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Check secrets are not expired
- Verify IAM user has necessary permissions

### "Deployment branches" Error

- Verify deployment branches are configured correctly
- Check branch names match exactly (case-sensitive)
- Ensure you're pushing to the correct branch

## Security Best Practices

1. **Rotate AWS Credentials**: Regularly rotate IAM access keys
2. **Minimal Permissions**: Use least privilege principle for IAM policies
3. **Separate Accounts**: Use separate AWS accounts for staging and production
4. **Audit Logs**: Enable CloudTrail for deployment auditing
5. **Secret Scanning**: Enable GitHub secret scanning
6. **Review Access**: Regularly review who has repository and environment access

## Next Steps

After completing this setup:

1. Test the full deployment pipeline
2. Configure monitoring and alerting
3. Set up deployment notifications
4. Document any custom configuration
5. Train team members on the deployment process

## Support

For issues with:
- GitHub configuration: Check GitHub Actions documentation
- AWS configuration: Check AWS IAM and CDK documentation
- Pipeline errors: Review workflow logs in Actions tab
