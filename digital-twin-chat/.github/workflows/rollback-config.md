# CI/CD Rollback Configuration

This document describes the automatic rollback mechanism in the CI/CD pipeline.

## Rollback Trigger

The rollback job (`rollback-on-failure`) is triggered when:
- Production deployment fails
- Only runs for `main` branch deployments
- Executes automatically without manual intervention

**Requirements Validated**: 8.5

## Rollback Mechanism

### Automatic Rollback Process

1. **Failure Detection**: Pipeline detects production deployment failure
2. **Rollback Initiation**: `rollback-on-failure` job starts automatically
3. **Version Identification**: Retrieves previous Lambda version
4. **Lambda Rollback**: Updates Lambda alias to previous version
5. **Notification**: Sends rollback notification (configurable)

### What Gets Rolled Back

**Lambda Function**:
- ✅ Rolled back to previous version automatically
- Uses Lambda versioning and aliases
- Previous version must exist

**Frontend (S3)**:
- ⚠️ Not automatically rolled back
- S3 versioning can be used for manual rollback
- Consider implementing automated S3 rollback if needed

**Infrastructure (CDK)**:
- ⚠️ Not automatically rolled back
- CloudFormation stack rollback handled by CDK
- Manual intervention may be required for infrastructure changes


## Rollback Job Configuration

### Job Definition

```yaml
rollback-on-failure:
  name: Rollback on Failure
  runs-on: ubuntu-latest
  needs: deploy-production
  if: failure() && github.ref == 'refs/heads/main'
```

### Rollback Steps

1. **Checkout Code**: Gets rollback scripts
2. **Configure AWS**: Sets up AWS credentials
3. **Trigger Rollback**: Executes rollback logic
4. **Send Notification**: Alerts team of rollback

## Lambda Version Management

### How Lambda Versioning Works

- Each Lambda deployment creates a new version
- Versions are immutable and numbered sequentially
- Aliases (like "live") point to specific versions
- Rollback updates the alias to previous version

### Version Selection

The rollback automatically selects:
- Second-to-last version (previous stable version)
- Falls back gracefully if no previous version exists

## Notification Configuration

### Current Implementation

The pipeline includes a notification step that outputs:
- Rollback status
- Environment affected
- Timestamp of rollback

### Recommended Integrations

**Slack Notification**:
```yaml
- name: Send Slack notification
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "🚨 Production deployment failed and rollback was triggered",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Production Rollback Alert*\n\nDeployment failed and automatic rollback was initiated."
            }
          }
        ]
      }
```

**Email Notification**:
```yaml
- name: Send email notification
  if: always()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Production Deployment Rollback
    body: Deployment to production failed and rollback was triggered.
    to: team@example.com
```

## Manual Rollback

### When to Use Manual Rollback

- Automatic rollback failed
- Need to rollback to specific version (not just previous)
- Need to rollback S3 frontend files
- Infrastructure changes need reverting

### Manual Rollback Process

1. **Identify Target Version**:
   ```bash
   cd digital-twin-chat/infrastructure
   ./rollback.sh production
   ```

2. **Select Version**: Script will list available versions

3. **Confirm Rollback**: Review and confirm the rollback

4. **Verify**: Check application is working correctly

## Rollback Testing

### Test Rollback Mechanism

1. **Create Test Failure**: Introduce intentional failure in production deployment
2. **Trigger Pipeline**: Push to main branch
3. **Observe Rollback**: Verify automatic rollback executes
4. **Check Logs**: Review rollback logs in GitHub Actions
5. **Verify Application**: Confirm application is on previous version

### Rollback Verification Checklist

- [ ] Lambda function version rolled back
- [ ] API health endpoint responding
- [ ] CloudWatch logs show correct version
- [ ] No errors in application logs
- [ ] Notification sent to team

## Failure Scenarios

### Scenario 1: Lambda Deployment Fails

**Cause**: Invalid Lambda package or configuration

**Rollback Action**:
- Automatic rollback to previous Lambda version
- Alias updated to point to previous version
- Application continues running on old version

**Recovery**:
1. Fix Lambda package issue
2. Redeploy via CI/CD pipeline

### Scenario 2: Frontend Deployment Fails

**Cause**: S3 sync error or CloudFront issue

**Rollback Action**:
- Lambda rollback still occurs
- Frontend may need manual rollback

**Recovery**:
1. Check S3 bucket for issues
2. Manually restore previous frontend files if needed
3. Invalidate CloudFront cache

### Scenario 3: Smoke Tests Fail

**Cause**: Deployment succeeded but application not working

**Rollback Action**:
- Automatic rollback triggered
- Previous version restored

**Recovery**:
1. Investigate smoke test failure
2. Fix application issue
3. Redeploy via CI/CD pipeline

## Monitoring Rollbacks

### CloudWatch Metrics

Monitor these metrics after rollback:
- Lambda invocation count
- Lambda error rate
- API Gateway 4xx/5xx errors
- Lambda duration

### CloudWatch Logs

Check these log groups:
- `/aws/lambda/{function-name}`: Lambda execution logs
- Look for version number in logs to confirm rollback

### GitHub Actions

- Review rollback job logs
- Check notification delivery
- Verify rollback completion status

## Best Practices

1. **Test Rollbacks**: Regularly test rollback mechanism in staging
2. **Version Management**: Keep multiple Lambda versions for rollback options
3. **Quick Detection**: Monitor deployments closely for quick failure detection
4. **Communication**: Ensure team is notified of rollbacks immediately
5. **Post-Mortem**: Conduct post-mortem after rollbacks to prevent recurrence

## Limitations

### Current Limitations

1. **S3 Rollback**: Not automated, requires manual intervention
2. **Infrastructure Rollback**: CDK handles this, but may need manual fixes
3. **Database Changes**: Not covered by rollback (use migrations carefully)
4. **Secrets**: Secret changes not rolled back automatically

### Future Enhancements

Consider implementing:
- Automated S3 rollback using versioning
- Blue-green deployments for zero-downtime rollbacks
- Canary deployments to detect issues before full rollout
- Automated rollback testing in staging

## Troubleshooting

### Rollback Job Doesn't Run

**Check**:
- Is deployment on `main` branch?
- Did production deployment actually fail?
- Are AWS credentials valid?

### Rollback Fails

**Check**:
- Does previous Lambda version exist?
- Are AWS permissions sufficient?
- Is Lambda function accessible?

### Application Still Broken After Rollback

**Actions**:
1. Check Lambda version in AWS Console
2. Verify alias points to correct version
3. Check CloudWatch logs for errors
4. Consider manual rollback to earlier version
5. Check if infrastructure changes need reverting

## Support

For rollback issues:
1. Check GitHub Actions logs
2. Review CloudWatch logs
3. Verify AWS resources in Console
4. Contact DevOps team if needed
5. Use manual rollback script as fallback
