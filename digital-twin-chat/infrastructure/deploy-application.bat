@echo off
REM Application deployment script for Digital Twin Chat (Windows)
REM Builds and deploys both backend (Lambda) and frontend (S3/CloudFront)

setlocal enabledelayedexpansion

REM Parse arguments
set ENV=%1

REM Validate environment
if "%ENV%"=="" (
    echo [ERROR] Usage: %0 ^<staging^|production^>
    echo [ERROR] Example: %0 staging
    exit /b 1
)

if not "%ENV%"=="staging" if not "%ENV%"=="production" (
    echo [ERROR] Invalid environment: %ENV%. Must be 'staging' or 'production'.
    exit /b 1
)

echo ========================================
echo Digital Twin Chat - Application Deployment
echo ========================================
echo.
echo [INFO] Environment: %ENV%
echo.

REM Check prerequisites
echo [INFO] Checking prerequisites...

where aws >nul 2>nul
if errorlevel 1 (
    echo [ERROR] AWS CLI is not installed. Please install it first.
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install it first.
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

REM Load deployment outputs
set OUTPUTS_FILE=outputs-%ENV%.json

if not exist %OUTPUTS_FILE% (
    echo [ERROR] Outputs file not found: %OUTPUTS_FILE%
    echo [ERROR] Please run deploy-infrastructure.bat first.
    exit /b 1
)

echo [INFO] Loading deployment outputs from %OUTPUTS_FILE%...

REM Note: Windows batch doesn't have jq by default
REM We'll need to parse the JSON manually or use PowerShell
REM For simplicity, we'll use PowerShell to extract values

for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.FrontendBucketName"') do set FRONTEND_BUCKET=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.MemoryBucketName"') do set MEMORY_BUCKET=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.ApiEndpoint"') do set API_ENDPOINT=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.CloudFrontDomain"') do set CLOUDFRONT_DOMAIN=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.LambdaFunctionName"') do set LAMBDA_FUNCTION=%%i

if "%FRONTEND_BUCKET%"=="" (
    echo [ERROR] Required outputs not found in %OUTPUTS_FILE%
    exit /b 1
)

echo [INFO] Outputs loaded successfully.
echo.

REM Package Lambda function
echo [INFO] Packaging Lambda function...
cd ..\backend

if exist lambda-package rmdir /s /q lambda-package
mkdir lambda-package

echo [INFO] Copying application code...
copy *.py lambda-package\ >nul 2>nul

echo [INFO] Installing Python dependencies...
pip install -q -r requirements.txt -t lambda-package\

echo [INFO] Creating deployment package...
cd lambda-package
powershell -Command "Compress-Archive -Path * -DestinationPath ..\lambda-deployment.zip -Force"
cd ..

echo [INFO] Lambda package created: backend\lambda-deployment.zip
cd ..\infrastructure
echo.

REM Deploy Lambda function
echo [INFO] Deploying Lambda function...
aws lambda update-function-code --function-name %LAMBDA_FUNCTION% --zip-file fileb://..\backend\lambda-deployment.zip --output json >nul

echo [INFO] Waiting for Lambda function to be updated...
aws lambda wait function-updated --function-name %LAMBDA_FUNCTION%

echo [INFO] Lambda function deployed successfully.
echo.

REM Build frontend
echo [INFO] Building frontend...
cd ..\frontend

if not exist node_modules (
    echo [INFO] Installing Node.js dependencies...
    call npm install
)

if not "%API_ENDPOINT%"=="" (
    set NEXT_PUBLIC_API_URL=%API_ENDPOINT%
    echo [INFO] API endpoint set to: %API_ENDPOINT%
)

echo [INFO] Running Next.js build...
call npm run build

if not exist out (
    echo [ERROR] Build failed: output directory 'out' not found.
    exit /b 1
)

echo [INFO] Frontend build completed successfully.
cd ..\infrastructure
echo.

REM Deploy frontend to S3
echo [INFO] Deploying frontend to S3...

aws s3 sync ..\frontend\out\ s3://%FRONTEND_BUCKET%/ --delete --cache-control "public, max-age=31536000, immutable" --exclude "index.html" --exclude "*.html"

aws s3 sync ..\frontend\out\ s3://%FRONTEND_BUCKET%/ --exclude "*" --include "*.html" --cache-control "public, max-age=0, must-revalidate"

echo [INFO] Frontend deployed to S3: %FRONTEND_BUCKET%
echo.

REM Invalidate CloudFront cache
if not "%CLOUDFRONT_DOMAIN%"=="" (
    echo [INFO] Looking up CloudFront distribution ID...
    for /f "delims=" %%i in ('aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='%CLOUDFRONT_DOMAIN%'].Id" --output text') do set DISTRIBUTION_ID=%%i
    
    if not "!DISTRIBUTION_ID!"=="" (
        echo [INFO] Invalidating CloudFront cache...
        for /f "delims=" %%i in ('aws cloudfront create-invalidation --distribution-id !DISTRIBUTION_ID! --paths "/*" --query "Invalidation.Id" --output text') do set INVALIDATION_ID=%%i
        echo [INFO] CloudFront invalidation created: !INVALIDATION_ID!
        echo [INFO] Note: Invalidation may take several minutes to complete.
    ) else (
        echo [WARN] CloudFront distribution ID not found. Skipping cache invalidation.
    )
) else (
    echo [WARN] CloudFront domain not found. Skipping cache invalidation.
)
echo.

REM Upload persona file if needed
if not "%MEMORY_BUCKET%"=="" (
    echo [INFO] Checking if persona file exists in S3...
    aws s3 ls s3://%MEMORY_BUCKET%/me.txt >nul 2>nul
    if errorlevel 1 (
        if exist ..\backend\me.txt (
            echo [INFO] Uploading persona file to S3...
            aws s3 cp ..\backend\me.txt s3://%MEMORY_BUCKET%/me.txt
            echo [INFO] Persona file uploaded.
        ) else (
            echo [WARN] Persona file not found at ..\backend\me.txt
            echo [WARN] Please upload it manually: aws s3 cp me.txt s3://%MEMORY_BUCKET%/me.txt
        )
    ) else (
        echo [INFO] Persona file already exists in S3.
    )
)
echo.

REM Run post-deployment tests
echo [INFO] Running post-deployment tests...

echo [INFO] Test 1: Checking Lambda function...
aws lambda get-function --function-name %LAMBDA_FUNCTION% >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Lambda function not accessible
) else (
    echo [INFO] Lambda function is accessible
)

echo [INFO] Test 2: Checking frontend deployment...
aws s3 ls s3://%FRONTEND_BUCKET%/index.html >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Frontend index.html not found in S3
) else (
    echo [INFO] Frontend deployed to S3
)

echo [INFO] Post-deployment tests completed.
echo.

REM Display deployment summary
echo.
echo ========================================
echo Deployment Summary
echo ========================================
echo.
echo Environment: %ENV%
echo.
echo Backend:
echo   Lambda Function: %LAMBDA_FUNCTION%
echo   API Endpoint: %API_ENDPOINT%
echo.
echo Frontend:
echo   S3 Bucket: %FRONTEND_BUCKET%
if not "%CLOUDFRONT_DOMAIN%"=="" (
    echo   CloudFront Domain: https://%CLOUDFRONT_DOMAIN%
)
echo.
echo Storage:
echo   Memory Bucket: %MEMORY_BUCKET%
echo.
echo ========================================
echo Application URLs
echo ========================================
echo.
if not "%CLOUDFRONT_DOMAIN%"=="" (
    echo Frontend: https://%CLOUDFRONT_DOMAIN%
)
echo API: %API_ENDPOINT%api/health
echo.
echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Verify the application is working:
if not "%CLOUDFRONT_DOMAIN%"=="" (
    echo    Open: https://%CLOUDFRONT_DOMAIN%
)
echo.
echo 2. Check API health:
echo    curl %API_ENDPOINT%api/health
echo.
echo 3. Monitor logs in CloudWatch:
echo    aws logs tail /aws/lambda/%LAMBDA_FUNCTION% --follow
echo.

echo [INFO] Application deployment completed successfully!

endlocal
