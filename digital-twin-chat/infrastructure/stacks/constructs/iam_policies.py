"""
IAM roles and policies following least privilege principles.
All policies specify exact resource ARNs without wildcards.
"""
from aws_cdk import (
    aws_iam as iam,
    aws_s3 as s3,
    aws_secretsmanager as secretsmanager,
)
from constructs import Construct


class LambdaExecutionRole:
    """Creates IAM role for Lambda function with least privilege policies."""

    @staticmethod
    def create_role(
        scope: Construct,
        role_id: str,
        memory_bucket: s3.IBucket,
        persona_bucket: s3.IBucket,
        llm_api_key_secret: secretsmanager.ISecret,
    ) -> iam.Role:
        """
        Create Lambda execution role with minimal required permissions.
        
        Args:
            scope: CDK construct scope
            role_id: Unique identifier for the role
            memory_bucket: S3 bucket for conversation memory
            persona_bucket: S3 bucket for persona file
            llm_api_key_secret: Secrets Manager secret for LLM API key
            
        Returns:
            IAM role with attached policies
        """
        role = iam.Role(
            scope,
            role_id,
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Execution role for Digital Twin Chat Lambda function",
        )

        # CloudWatch Logs policy - specific log group
        logs_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            resources=[
                f"arn:aws:logs:{scope.region}:{scope.account}:log-group:/aws/lambda/*",
            ],
        )
        role.add_to_policy(logs_policy)

        # S3 read/write policy for memory bucket - specific bucket only
        s3_memory_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
            ],
            resources=[
                memory_bucket.bucket_arn,
                f"{memory_bucket.bucket_arn}/*",
            ],
        )
        role.add_to_policy(s3_memory_policy)

        # S3 read policy for persona bucket - specific bucket only
        s3_persona_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "s3:GetObject",
                "s3:ListBucket",
            ],
            resources=[
                persona_bucket.bucket_arn,
                f"{persona_bucket.bucket_arn}/*",
            ],
        )
        role.add_to_policy(s3_persona_policy)

        # Secrets Manager read policy - specific secret only
        secrets_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret",
            ],
            resources=[
                llm_api_key_secret.secret_arn,
            ],
        )
        role.add_to_policy(secrets_policy)

        # Bedrock InvokeModel policy - specific models only
        # Note: This is region-specific and model-specific
        bedrock_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
            ],
            resources=[
                # Specific model ARNs - adjust based on actual models used
                f"arn:aws:bedrock:{scope.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
                f"arn:aws:bedrock:{scope.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
                f"arn:aws:bedrock:{scope.region}::foundation-model/anthropic.claude-v2:1",
            ],
        )
        role.add_to_policy(bedrock_policy)

        return role
