"""
Storage construct for S3 buckets.
Creates buckets for frontend static hosting and conversation memory storage.
"""
from aws_cdk import (
    RemovalPolicy,
    Duration,
    aws_s3 as s3,
)
from constructs import Construct


class StorageConstruct(Construct):
    """Construct for S3 storage resources."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
    ) -> None:
        super().__init__(scope, construct_id)

        # Frontend static hosting bucket
        self.frontend_bucket = s3.Bucket(
            self,
            "FrontendBucket",
            bucket_name=None,  # Auto-generate unique name
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            versioned=False,
            removal_policy=RemovalPolicy.RETAIN,
            auto_delete_objects=False,
            enforce_ssl=True,
        )

        # Memory store bucket with versioning
        self.memory_bucket = s3.Bucket(
            self,
            "MemoryBucket",
            bucket_name=None,  # Auto-generate unique name
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            versioned=True,  # Enable versioning for conversation history
            removal_policy=RemovalPolicy.RETAIN,
            auto_delete_objects=False,
            enforce_ssl=True,
            lifecycle_rules=[
                # Transition old versions to cheaper storage after 30 days
                s3.LifecycleRule(
                    id="TransitionOldVersions",
                    noncurrent_version_transitions=[
                        s3.NoncurrentVersionTransition(
                            storage_class=s3.StorageClass.INTELLIGENT_TIERING,
                            transition_after=Duration.days(30),
                        )
                    ],
                    enabled=True,
                )
            ],
        )
