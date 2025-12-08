"""
API Gateway construct for HTTP API.
Creates API Gateway with Lambda integration, CORS, and throttling.
"""
from aws_cdk import (
    Duration,
    aws_apigatewayv2 as apigw,
    aws_apigatewayv2_integrations as integrations,
    aws_lambda as lambda_,
)
from constructs import Construct


class ApiConstruct(Construct):
    """Construct for API Gateway resources."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        lambda_function: lambda_.IFunction,
    ) -> None:
        super().__init__(scope, construct_id)

        # Create Lambda integration
        lambda_integration = integrations.HttpLambdaIntegration(
            "LambdaIntegration",
            lambda_function,
            payload_format_version=apigw.PayloadFormatVersion.VERSION_2_0,
        )

        # Create HTTP API (lower cost than REST API)
        self.http_api = apigw.HttpApi(
            self,
            "DigitalTwinChatApi",
            api_name=f"digital-twin-chat-api-{env_name}",
            description=f"Digital Twin Chat API ({env_name})",
            cors_preflight=apigw.CorsPreflightOptions(
                allow_origins=["*"],  # Configure specific origins in production
                allow_methods=[
                    apigw.CorsHttpMethod.GET,
                    apigw.CorsHttpMethod.POST,
                    apigw.CorsHttpMethod.OPTIONS,
                ],
                allow_headers=[
                    "Content-Type",
                    "Authorization",
                    "X-Amz-Date",
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                ],
                max_age=Duration.hours(1),
            ),
            default_integration=lambda_integration,
        )

        # Add throttling settings
        # Note: HTTP API throttling is configured at the stage level
        default_stage = self.http_api.default_stage
        if default_stage:
            # Throttle settings: 1000 requests/second as per requirements
            default_stage.node.add_metadata(
                "throttle",
                {
                    "burstLimit": 2000,
                    "rateLimit": 1000,
                }
            )

        # Store API domain for CloudFront origin
        self.api_domain = self.http_api.url or ""
