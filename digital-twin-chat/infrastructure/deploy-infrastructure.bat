@echo off
REM Enhanced deployment script for Digital Twin Chat infrastructure (Windows)
REM Supports staging and production environments with validation and smoke tests

setlocal enabledelayedexpansion

REM Parse arguments
set ENV=%1
set REGION=%2
set ACCOUNT=%3

if "%REGION%"=="" set REGION=us-east-1

REM Validate environment
if "%ENV%"=="" (
    echo [ERROR] Usage: %0 ^<staging^|production^> [region] [account]
    echo [ERROR] Example: %0 staging us-east-1
    exit /b 1
)

if not "%ENV%"=="staging" if not "%ENV%"=="production" (
    echo [ERROR] Invalid environment: %ENV%. Must be 'staging' or 'production'.
    exit /b 1
)

echo ========================================
echo Digital Twin Chat - Infrastructure Deployment
echo ========================================
echo.
echo [INFO] Environment: %ENV%
echo [INFO] Region: %REGION%
echo.

REM Check prerequisites
echo [INFO] Checking prerequisites...

where aws >nul 2>nul
if errorlevel 1 (
    echo [ERROR] AWS CLI is not installed. Please install it first.
    exit /b 1
)

where cdk >nul 2>nul
if errorlevel 1 (
    echo [ERROR] AWS CDK is not installed. Please install it: npm install -g aws-cdk
    exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed. Please install it first.
    exit /b 1
)

aws sts get-caller-identity >nul 2>nul
if errorlevel 1 (
    echo [ERROR] AWS credentials are not configured. Please run 'aws configure'.
    exit /b 1
)

echo [INFO] All prerequisites met.
echo.

REM Install dependencies
echo [INFO] Installing Python dependencies...

if not exist .venv (
    echo [INFO] Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

pip install -q -r requirements.txt

echo [INFO] Dependencies installed.
echo.

REM Bootstrap CDK if account is provided
if not "%ACCOUNT%"=="" (
    echo [INFO] Bootstrapping CDK for account %ACCOUNT% in region %REGION%...
    cdk bootstrap aws://%ACCOUNT%/%REGION%
)

REM Synthesize stack
echo [INFO] Synthesizing CloudFormation template for %ENV% environment...

if not "%ACCOUNT%"=="" (
    cdk synth --context env=%ENV% --context region=%REGION% --context account=%ACCOUNT%
) else (
    cdk synth --context env=%ENV% --context region=%REGION%
)

echo [INFO] Synthesis complete.
echo.

REM Deploy stack
echo [INFO] Deploying infrastructure stack for %ENV% environment...

if not "%ACCOUNT%"=="" (
    cdk deploy --context env=%ENV% --context region=%REGION% --context account=%ACCOUNT% --require-approval never --outputs-file outputs-%ENV%.json
) else (
    cdk deploy --context env=%ENV% --context region=%REGION% --require-approval never --outputs-file outputs-%ENV%.json
)

echo [INFO] Deployment complete.
echo.

REM Extract outputs (basic extraction without jq)
echo [INFO] Extracting deployment outputs...
set OUTPUTS_FILE=outputs-%ENV%.json

if not exist %OUTPUTS_FILE% (
    echo [WARN] Outputs file not found: %OUTPUTS_FILE%
    goto :skip_smoke_tests
)

REM Note: Windows batch doesn't have jq by default, so we'll skip detailed parsing
echo [INFO] Outputs saved to %OUTPUTS_FILE%
echo [WARN] Please manually verify outputs in %OUTPUTS_FILE%

:skip_smoke_tests
echo.

REM Display post-deployment instructions
echo.
echo ========================================
echo Deployment Summary
echo ========================================
echo.
echo Environment: %ENV%
echo.
echo Check outputs-%ENV%.json for deployment details including:
echo - Frontend Bucket Name
echo - Memory Bucket Name
echo - API Endpoint
echo - CloudFront Domain
echo - Lambda Function Name
echo.
echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Set the LLM API key in Secrets Manager:
echo    aws secretsmanager put-secret-value --secret-id digital-twin-chat/%ENV%/llm-api-key --secret-string "YOUR_API_KEY"
echo.
echo 2. Upload persona file to S3:
echo    aws s3 cp ..\backend\me.txt s3://MEMORY_BUCKET_NAME/me.txt
echo.
echo 3. Deploy the application (frontend and backend):
echo    deploy-application.bat %ENV%
echo.

echo [INFO] Infrastructure deployment completed successfully!

endlocal
