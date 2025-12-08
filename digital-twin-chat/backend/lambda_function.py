"""
Lambda handler for Digital Twin Chat
This module serves as the entry point for AWS Lambda
"""
from main import handler as lambda_handler

# AWS Lambda will call this function
__all__ = ['lambda_handler']
