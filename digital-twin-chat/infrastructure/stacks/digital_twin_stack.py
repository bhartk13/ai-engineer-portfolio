"""
Main CDK stack for Digital Twin Chat application.
Defines all AWS resources including S3, Lambda, API Gateway, CloudFront, etc.
"""
from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
)
from constructs import Construct
from .constructs.storage import StorageConstruct
from .constructs.compute import ComputeConstruct
from .constructs.api import ApiConstruct
from .constructs.cdn import CdnConstruct
from .constructs.secrets import SecretsConstruct
from .constructs.monitoring import MonitoringConstruct


class DigitalTwinStack(Stack):
    """Main stack for Digital Twin Chat infrastructure."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name

        # Create secrets for API keys
        secrets = SecretsConstruct(self, "Secrets", env_name=env_name)

        # Create S3 buckets for storage
        storage = StorageConstruct(self, "Storage", env_name=env_name)

        # Create Lambda function and IAM roles
        compute = ComputeConstruct(
            self,
            "Compute",
            env_name=env_name,
            memory_bucket=storage.memory_bucket,
            persona_bucket=storage.memory_bucket,  # Using same bucket for simplicity
            llm_api_key_secret=secrets.llm_api_key_secret,
        )

        # Create API Gateway
        api = ApiConstruct(
            self,
            "Api",
            env_name=env_name,
            lambda_function=compute.lambda_function,
        )

        # Create CloudFront distribution for frontend
        cdn = CdnConstruct(
            self,
            "Cdn",
            env_name=env_name,
            frontend_bucket=storage.frontend_bucket,
            api_domain=api.api_domain,
        )

        # Create monitoring resources
        monitoring = MonitoringConstruct(
            self,
            "Monitoring",
            env_name=env_name,
            lambda_function=compute.lambda_function,
            api=api.http_api,
        )

        # Outputs
        CfnOutput(
            self,
            "FrontendBucketName",
            value=storage.frontend_bucket.bucket_name,
            description="S3 bucket for frontend static files",
        )

        CfnOutput(
            self,
            "MemoryBucketName",
            value=storage.memory_bucket.bucket_name,
            description="S3 bucket for conversation memory storage",
        )

        CfnOutput(
            self,
            "ApiEndpoint",
            value=api.http_api.url or "N/A",
            description="API Gateway endpoint URL",
        )

        CfnOutput(
            self,
            "CloudFrontDomain",
            value=cdn.distribution.distribution_domain_name,
            description="CloudFront distribution domain",
        )

        CfnOutput(
            self,
            "LambdaFunctionName",
            value=compute.lambda_function.function_name,
            description="Lambda function name",
        )
