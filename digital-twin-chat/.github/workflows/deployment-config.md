# CI/CD Deployment Configuration

This document describes the deployment stages and configuration in the CI/CD pipeline.

## Deployment Stages

### Stage 1: Automatic Staging Deployment

**Trigger**: Push to `develop` branch or manual workflow dispatch

**Jobs**:
1. `deploy-staging`: Deploys infrastructure and application to staging environment
   - Deploys AWS infrastructure using CDK
   - Updates Lambda function with new code
   - Deploys frontend to S3
   - Invalidates CloudFront cache

**Environment**: `staging`

**Requirements Validated**: 8.3

**Behavior**:
- Runs automatically after tests pass
- No manual approval required
- Uses staging AWS credentials and configuration
- Outputs staging URL for testing

### Stage 2: Integration Tests on Staging

**Trigger**: After successful staging deployment

**Jobs**:
1. `integration-tests`: Runs integration tests against staging environment
   - Tests API health endpoint
   - Validates deployment success
   - Checks basic functionality

**Requirements Validated**: 8.3

**Behavior**:
- Runs automatically after staging deployment
- Must pass before production deployment can proceed
- Failures prevent production deployment

### Stage 3: Manual Production Approval

**Trigger**: After successful integration tests on staging (main branch only)

**Jobs**:
1. `approve-production`: Manual approval gate for production deployment

**Environment**: `production-approval`

**Requirements Validated**: 8.4

**Behavior**:
- Requires manual approval in GitHub Actions UI
- Only runs for `main` branch
- Designated approvers must review and approve
- Can be configured with required reviewers in GitHub settings

### Stage 4: Production Deployment

**Trigger**: After manual approval

**Jobs**:
1. `deploy-production`: Deploys infrastructure and application to production
   - Deploys AWS infrastructure using CDK
   - Updates Lambda function with new code
   - Deploys frontend to S3
   - Invalidates CloudFront cache
   - Runs smoke tests

**Environment**: `production`

**Requirements Validated**: 8.3, 8.4

**Behavior**:
- Only runs after manual approval
- Only runs for `main` branch
- Uses production AWS credentials and configuration
- Outputs production URL
- Runs smoke tests to verify deployment

## GitHub Environment Configuration

### Required Environments

Configure these environments in GitHub repository settings:

#### 1. Staging Environment

**Name**: `staging`

**Protection Rules**:
- No required reviewers (automatic deployment)
- No wait timer

**Environment Secrets**:
- `STAGING_API_URL`: Staging API endpoint URL

**Environment Variables**:
- None required (uses context from CDK)

#### 2. Production Approval Environment

**Name**: `production-approval`

**Protection Rules**:
- **Required reviewers**: Add team members who can approve production deployments
- **Wait timer**: Optional (e.g., 5 minutes to allow review)

**Environment Secrets**:
- None required

**Environment Variables**:
- None required

#### 3. Production Environment

**Name**: `production`

**Protection Rules**:
- Deployment branches: Only `main` branch
- No additional reviewers (approval handled by production-approval environment)

**Environment Secrets**:
- `PRODUCTION_API_URL`: Production API endpoint URL (optional, for documentation)

**Environment Variables**:
- None required (uses context from CDK)

### Repository Secrets

Configure these secrets at the repository level (Settings > Secrets and variables > Actions):

**Required Secrets**:
- `AWS_ACCESS_KEY_ID`: AWS access key for deployments
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key for deployments
- `STAGING_API_URL`: Staging API endpoint (can also be in staging environment)

**Optional Secrets**:
- `SLACK_WEBHOOK_URL`: For deployment notifications
- `PRODUCTION_API_URL`: Production API endpoint for reference

## Deployment Flow

### Staging Deployment Flow

```
Push to develop
  ↓
Run tests (backend + frontend)
  ↓
Build artifacts (Lambda + frontend)
  ↓
Deploy to staging (automatic)
  ↓
Run integration tests
  ↓
Complete (staging ready for testing)
```

### Production Deployment Flow

```
Push to main
  ↓
Run tests (backend + frontend)
  ↓
Build artifacts (Lambda + frontend)
  ↓
Deploy to staging (automatic)
  ↓
Run integration tests
  ↓
Wait for manual approval ⏸️
  ↓
Deploy to production (after approval)
  ↓
Run smoke tests
  ↓
Complete (production deployed)
```

## Branch Strategy

### Recommended Git Flow

- **`develop`**: Development branch
  - Triggers staging deployments
  - Used for feature integration
  - Always deployable to staging

- **`main`**: Production branch
  - Triggers production deployments (with approval)
  - Only merge after staging validation
  - Protected branch with required reviews

- **Feature branches**: `feature/*`
  - Create from `develop`
  - Merge back to `develop` via pull request
  - Run tests but don't deploy

## Manual Deployment

### Trigger Manual Deployment

You can manually trigger deployments using GitHub Actions UI:

1. Go to Actions tab
2. Select "CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Select branch and environment
5. Click "Run workflow"

This is useful for:
- Redeploying without code changes
- Deploying specific branches to staging
- Emergency deployments

## Deployment Artifacts

### Build Artifacts

The pipeline creates and stores these artifacts:

1. **Lambda Package** (`lambda-package`)
   - Contains packaged Lambda function
   - Includes all Python dependencies
   - Retained for 7 days

2. **Frontend Build** (`frontend-build`)
   - Contains Next.js static export
   - Ready for S3 deployment
   - Retained for 7 days

### Deployment Outputs

Each deployment creates an outputs file:
- `outputs-staging.json`: Staging infrastructure outputs
- `outputs-production.json`: Production infrastructure outputs

These files contain:
- Frontend bucket name
- Memory bucket name
- API endpoint URL
- CloudFront domain
- Lambda function name

## Monitoring Deployments

### GitHub Actions UI

- View deployment status in Actions tab
- Check logs for each job
- Review deployment outputs
- Monitor approval status

### AWS Console

- CloudWatch Logs: View Lambda execution logs
- CloudWatch Metrics: Monitor Lambda performance
- S3: Verify frontend files deployed
- Lambda: Check function version and configuration

## Troubleshooting

### Staging Deployment Fails

1. Check test results - tests must pass first
2. Review deployment logs in GitHub Actions
3. Verify AWS credentials are valid
4. Check CDK synthesis for errors
5. Verify S3 buckets and Lambda function exist

### Integration Tests Fail

1. Check API endpoint is accessible
2. Verify Lambda function is running
3. Check CloudWatch logs for errors
4. Ensure secrets are configured in Secrets Manager
5. Test API manually using curl or Postman

### Production Approval Timeout

1. Notify required reviewers
2. Check approval requirements in environment settings
3. Verify reviewers have necessary permissions
4. Consider adjusting wait timer if configured

### Production Deployment Fails

1. Automatic rollback will be triggered
2. Check rollback logs
3. Review deployment logs for errors
4. Verify production AWS credentials
5. Check if infrastructure changes are needed

## Best Practices

1. **Test in Staging First**: Always validate changes in staging before production
2. **Monitor Deployments**: Watch CloudWatch logs during deployment
3. **Quick Rollback**: Keep rollback scripts ready for emergencies
4. **Document Changes**: Update deployment notes for significant changes
5. **Review Approvals**: Production approvers should review staging results
6. **Gradual Rollout**: Consider blue-green or canary deployments for major changes

## Security Considerations

1. **Secrets Management**: Never commit secrets to repository
2. **AWS Credentials**: Use IAM roles with minimal permissions
3. **Environment Isolation**: Keep staging and production separate
4. **Approval Process**: Require multiple approvers for production
5. **Audit Trail**: GitHub Actions provides deployment history

## Continuous Improvement

- Monitor deployment times and optimize slow steps
- Add more integration tests as needed
- Implement canary deployments for safer rollouts
- Add deployment notifications (Slack, email)
- Create deployment dashboards for visibility
