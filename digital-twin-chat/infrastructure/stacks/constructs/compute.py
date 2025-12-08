"""
Compute construct for Lambda function.
Packages FastAPI backend with Mangum adapter for Lambda deployment.
"""
from aws_cdk import (
    Duration,
    aws_lambda as lambda_,
    aws_s3 as s3,
    aws_secretsmanager as secretsmanager,
)
from constructs import Construct
from .iam_policies import LambdaExecutionRole


class ComputeConstruct(Construct):
    """Construct for Lambda compute resources."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        memory_bucket: s3.IBucket,
        persona_bucket: s3.IBucket,
        llm_api_key_secret: secretsmanager.ISecret,
    ) -> None:
        super().__init__(scope, construct_id)

        # Create IAM role with least privilege policies
        execution_role = LambdaExecutionRole.create_role(
            self,
            "LambdaExecutionRole",
            memory_bucket=memory_bucket,
            persona_bucket=persona_bucket,
            llm_api_key_secret=llm_api_key_secret,
        )

        # Lambda function with FastAPI backend
        self.lambda_function = lambda_.Function(
            self,
            "DigitalTwinChatFunction",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="main.handler",  # Mangum handler
            code=lambda_.Code.from_asset("../backend"),
            role=execution_role,
            memory_size=1024,  # 1GB as per requirements
            timeout=Duration.seconds(30),
            architecture=lambda_.Architecture.ARM_64,  # Better price/performance
            environment={
                "ENVIRONMENT": env_name,
                "S3_MEMORY_BUCKET": memory_bucket.bucket_name,
                "S3_PERSONA_BUCKET": persona_bucket.bucket_name,
                "LLM_API_KEY_SECRET_NAME": llm_api_key_secret.secret_name,
                "LOG_LEVEL": "INFO" if env_name == "prod" else "DEBUG",
            },
            description=f"Digital Twin Chat API ({env_name})",
        )

        # Grant permissions explicitly (defense in depth)
        memory_bucket.grant_read_write(self.lambda_function)
        persona_bucket.grant_read(self.lambda_function)
        llm_api_key_secret.grant_read(self.lambda_function)
