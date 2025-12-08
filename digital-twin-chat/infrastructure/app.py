#!/usr/bin/env python3
"""
AWS CDK application entry point for Digital Twin Chat infrastructure.
"""
import aws_cdk as cdk
from stacks.digital_twin_stack import DigitalTwinStack

app = cdk.App()

# Get environment from context or default to 'dev'
env_name = app.node.try_get_context("env") or "dev"

# Define AWS environment
env = cdk.Environment(
    account=app.node.try_get_context("account"),
    region=app.node.try_get_context("region") or "us-east-1"
)

# Create the main stack
DigitalTwinStack(
    app,
    f"DigitalTwinChatStack-{env_name}",
    env_name=env_name,
    env=env,
    description=f"Digital Twin Chat Application Infrastructure ({env_name})"
)

app.synth()
