"""
CloudWatch monitoring construct for observability.
Creates log groups, metric alarms, and dashboards for system health.
"""
from aws_cdk import (
    Duration,
    aws_cloudwatch as cloudwatch,
    aws_cloudwatch_actions as cw_actions,
    aws_lambda as lambda_,
    aws_logs as logs,
    aws_apigatewayv2 as apigw,
    aws_sns as sns,
)
from constructs import Construct


class MonitoringConstruct(Construct):
    """Construct for CloudWatch monitoring resources."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        lambda_function: lambda_.IFunction,
        api: apigw.IHttpApi,
    ) -> None:
        super().__init__(scope, construct_id)

        # Create SNS topic for alarm notifications
        alarm_topic = sns.Topic(
            self,
            "AlarmTopic",
            topic_name=f"digital-twin-chat-alarms-{env_name}",
            display_name=f"Digital Twin Chat Alarms ({env_name})",
        )

        # Lambda log group (created automatically, but we define retention)
        log_group = logs.LogGroup(
            self,
            "LambdaLogGroup",
            log_group_name=f"/aws/lambda/{lambda_function.function_name}",
            retention=logs.RetentionDays.ONE_MONTH if env_name == "prod" else logs.RetentionDays.ONE_WEEK,
        )

        # Lambda error rate alarm
        lambda_error_alarm = cloudwatch.Alarm(
            self,
            "LambdaErrorAlarm",
            alarm_name=f"digital-twin-chat-lambda-errors-{env_name}",
            alarm_description="Lambda error rate exceeds 5%",
            metric=lambda_function.metric_errors(
                statistic=cloudwatch.Stats.SUM,
                period=Duration.minutes(5),
            ),
            threshold=5,
            evaluation_periods=2,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )
        lambda_error_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))

        # Lambda duration alarm (approaching timeout)
        lambda_duration_alarm = cloudwatch.Alarm(
            self,
            "LambdaDurationAlarm",
            alarm_name=f"digital-twin-chat-lambda-duration-{env_name}",
            alarm_description="Lambda duration approaching timeout (>25s)",
            metric=lambda_function.metric_duration(
                statistic=cloudwatch.Stats.AVERAGE,
                period=Duration.minutes(5),
            ),
            threshold=25000,  # 25 seconds (timeout is 30s)
            evaluation_periods=2,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )
        lambda_duration_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))

        # Lambda throttle alarm
        lambda_throttle_alarm = cloudwatch.Alarm(
            self,
            "LambdaThrottleAlarm",
            alarm_name=f"digital-twin-chat-lambda-throttles-{env_name}",
            alarm_description="Lambda function is being throttled",
            metric=lambda_function.metric_throttles(
                statistic=cloudwatch.Stats.SUM,
                period=Duration.minutes(5),
            ),
            threshold=1,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )
        lambda_throttle_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))

        # API Gateway 5xx error alarm
        api_5xx_alarm = cloudwatch.Alarm(
            self,
            "Api5xxAlarm",
            alarm_name=f"digital-twin-chat-api-5xx-{env_name}",
            alarm_description="API Gateway 5xx error rate exceeds 1%",
            metric=cloudwatch.Metric(
                namespace="AWS/ApiGateway",
                metric_name="5XXError",
                dimensions_map={
                    "ApiId": api.http_api_id,
                },
                statistic=cloudwatch.Stats.SUM,
                period=Duration.minutes(5),
            ),
            threshold=10,  # More than 10 errors in 5 minutes
            evaluation_periods=2,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )
        api_5xx_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))

        # API Gateway 4xx error alarm (high rate indicates client issues)
        api_4xx_alarm = cloudwatch.Alarm(
            self,
            "Api4xxAlarm",
            alarm_name=f"digital-twin-chat-api-4xx-{env_name}",
            alarm_description="API Gateway 4xx error rate is high",
            metric=cloudwatch.Metric(
                namespace="AWS/ApiGateway",
                metric_name="4XXError",
                dimensions_map={
                    "ApiId": api.http_api_id,
                },
                statistic=cloudwatch.Stats.SUM,
                period=Duration.minutes(5),
            ),
            threshold=50,  # More than 50 errors in 5 minutes
            evaluation_periods=2,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )
        api_4xx_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))

        # Create CloudWatch Dashboard
        dashboard = cloudwatch.Dashboard(
            self,
            "Dashboard",
            dashboard_name=f"digital-twin-chat-{env_name}",
        )

        # Add Lambda metrics to dashboard
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Lambda Invocations",
                left=[
                    lambda_function.metric_invocations(
                        statistic=cloudwatch.Stats.SUM,
                        period=Duration.minutes(5),
                    )
                ],
            ),
            cloudwatch.GraphWidget(
                title="Lambda Errors",
                left=[
                    lambda_function.metric_errors(
                        statistic=cloudwatch.Stats.SUM,
                        period=Duration.minutes(5),
                    )
                ],
            ),
            cloudwatch.GraphWidget(
                title="Lambda Duration",
                left=[
                    lambda_function.metric_duration(
                        statistic=cloudwatch.Stats.AVERAGE,
                        period=Duration.minutes(5),
                    )
                ],
            ),
        )

        # Add API Gateway metrics to dashboard
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="API Request Count",
                left=[
                    cloudwatch.Metric(
                        namespace="AWS/ApiGateway",
                        metric_name="Count",
                        dimensions_map={
                            "ApiId": api.http_api_id,
                        },
                        statistic=cloudwatch.Stats.SUM,
                        period=Duration.minutes(5),
                    )
                ],
            ),
            cloudwatch.GraphWidget(
                title="API Latency",
                left=[
                    cloudwatch.Metric(
                        namespace="AWS/ApiGateway",
                        metric_name="Latency",
                        dimensions_map={
                            "ApiId": api.http_api_id,
                        },
                        statistic=cloudwatch.Stats.AVERAGE,
                        period=Duration.minutes(5),
                    )
                ],
            ),
            cloudwatch.GraphWidget(
                title="API Errors",
                left=[
                    cloudwatch.Metric(
                        namespace="AWS/ApiGateway",
                        metric_name="4XXError",
                        dimensions_map={
                            "ApiId": api.http_api_id,
                        },
                        statistic=cloudwatch.Stats.SUM,
                        period=Duration.minutes(5),
                        label="4XX Errors",
                    ),
                    cloudwatch.Metric(
                        namespace="AWS/ApiGateway",
                        metric_name="5XXError",
                        dimensions_map={
                            "ApiId": api.http_api_id,
                        },
                        statistic=cloudwatch.Stats.SUM,
                        period=Duration.minutes(5),
                        label="5XX Errors",
                    ),
                ],
            ),
        )

        # Store alarm topic for external subscriptions
        self.alarm_topic = alarm_topic
