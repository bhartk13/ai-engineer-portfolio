"""
Secrets Manager construct for secure credential storage.
Creates secrets with KMS encryption for LLM API keys.
"""
from aws_cdk import (
    RemovalPolicy,
    aws_secretsmanager as secretsmanager,
    aws_kms as kms,
)
from constructs import Construct


class SecretsConstruct(Construct):
    """Construct for Secrets Manager resources."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
    ) -> None:
        super().__init__(scope, construct_id)

        # LLM API Key secret (using AWS managed encryption key)
        self.llm_api_key_secret = secretsmanager.Secret(
            self,
            "LlmApiKeySecret",
            secret_name=f"digital-twin-chat/{env_name}/llm-api-key",
            description=f"LLM API key for Digital Twin Chat ({env_name})",
            removal_policy=RemovalPolicy.RETAIN,
            # Note: Secret value must be set manually after deployment
            # via AWS Console or CLI: aws secretsmanager put-secret-value
        )
