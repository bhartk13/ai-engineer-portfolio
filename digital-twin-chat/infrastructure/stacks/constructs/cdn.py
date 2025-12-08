"""
CloudFront CDN construct for frontend distribution.
Creates CloudFront distribution with S3 origin, HTTPS enforcement, and caching.
"""
from aws_cdk import (
    Duration,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
)
from constructs import Construct


class CdnConstruct(Construct):
    """Construct for CloudFront CDN resources."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        frontend_bucket: s3.IBucket,
        api_domain: str,
    ) -> None:
        super().__init__(scope, construct_id)

        # Create Origin Access Identity for S3 bucket access
        oai = cloudfront.OriginAccessIdentity(
            self,
            "OAI",
            comment=f"OAI for Digital Twin Chat frontend ({env_name})",
        )

        # Grant CloudFront read access to S3 bucket
        frontend_bucket.grant_read(oai)

        # Create S3 origin
        s3_origin = origins.S3Origin(
            frontend_bucket,
            origin_access_identity=oai,
        )

        # Create CloudFront distribution
        self.distribution = cloudfront.Distribution(
            self,
            "FrontendDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=s3_origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress=True,
            ),
            default_root_object="index.html",
            error_responses=[
                # SPA routing - redirect 404s to index.html
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(5),
                ),
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(5),
                ),
            ],
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,  # US, Canada, Europe
            enable_logging=True,
            comment=f"Digital Twin Chat Frontend ({env_name})",
        )

        # Add cache behavior for index.html (no caching)
        self.distribution.add_behavior(
            "/index.html",
            s3_origin,
            viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cache_policy=cloudfront.CachePolicy(
                self,
                "NoCachePolicy",
                cache_policy_name=f"digital-twin-no-cache-{env_name}",
                comment="No caching for index.html",
                default_ttl=Duration.seconds(0),
                min_ttl=Duration.seconds(0),
                max_ttl=Duration.seconds(0),
            ),
        )

        # Store distribution domain
        self.distribution_domain = self.distribution.distribution_domain_name
