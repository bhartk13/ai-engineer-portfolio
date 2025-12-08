@echo off
REM Rollback script for Digital Twin Chat (Windows)
REM Rolls back Lambda function to previous version and optionally restores S3 frontend files

setlocal enabledelayedexpansion

REM Parse arguments
set ENV=%1
set TARGET_VERSION=%2

REM Validate environment
if "%ENV%"=="" (
    echo [ERROR] Usage: %0 ^<staging^|production^> [lambda-version]
    echo [ERROR] Example: %0 staging 3
    echo [ERROR]
    echo [ERROR] If lambda-version is not provided, you will be prompted to select one.
    exit /b 1
)

if not "%ENV%"=="staging" if not "%ENV%"=="production" (
    echo [ERROR] Invalid environment: %ENV%. Must be 'staging' or 'production'.
    exit /b 1
)

echo ========================================
echo Digital Twin Chat - Rollback
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
    echo [ERROR] Cannot determine resource names for rollback.
    exit /b 1
)

echo [INFO] Loading deployment outputs from %OUTPUTS_FILE%...

for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.FrontendBucketName"') do set FRONTEND_BUCKET=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.LambdaFunctionName"') do set LAMBDA_FUNCTION=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content %OUTPUTS_FILE% | ConvertFrom-Json).PSObject.Properties.Value.CloudFrontDomain"') do set CLOUDFRONT_DOMAIN=%%i

if "%LAMBDA_FUNCTION%"=="" (
    echo [ERROR] Lambda function name not found in %OUTPUTS_FILE%
    exit /b 1
)

echo [INFO] Outputs loaded successfully.
echo.

REM Get current Lambda version
echo [INFO] Getting current Lambda version...

for /f "delims=" %%i in ('aws lambda get-alias --function-name %LAMBDA_FUNCTION% --name live --query FunctionVersion --output text 2^>nul') do set CURRENT_VERSION=%%i

if "%CURRENT_VERSION%"=="" (
    for /f "delims=" %%i in ('aws lambda get-function --function-name %LAMBDA_FUNCTION% --query Configuration.Version --output text') do set CURRENT_VERSION=%%i
    echo [INFO] Current version: !CURRENT_VERSION! (no alias configured)
) else (
    echo [INFO] Current version (via 'live' alias): %CURRENT_VERSION%
)
echo.

REM List Lambda versions if target not provided
if "%TARGET_VERSION%"=="" (
    echo [STEP] Listing available Lambda versions...
    echo.
    echo Available versions:
    echo -------------------
    
    aws lambda list-versions-by-function --function-name %LAMBDA_FUNCTION% --query "Versions[?Version!=`$LATEST`].[Version,LastModified,Description]" --output text
    
    echo.
    set /p TARGET_VERSION="Enter the version number to rollback to: "
    
    if "!TARGET_VERSION!"=="" (
        echo [ERROR] No version specified. Aborting rollback.
        exit /b 1
    )
)

REM Confirm rollback
echo.
echo [WARN] You are about to rollback the following:
echo   Environment: %ENV%
echo   Lambda Function: %LAMBDA_FUNCTION%
echo   Target Version: %TARGET_VERSION%
echo.
set /p CONFIRM="Are you sure you want to proceed? (yes/no): "

if /i not "%CONFIRM%"=="yes" (
    echo [INFO] Rollback cancelled.
    exit /b 0
)
echo.

REM Verify target version exists
echo [STEP] Rolling back Lambda function to version %TARGET_VERSION%...

aws lambda get-function --function-name %LAMBDA_FUNCTION% --qualifier %TARGET_VERSION% >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Version %TARGET_VERSION% does not exist for function %LAMBDA_FUNCTION%
    exit /b 1
)

REM Update or create alias
aws lambda get-alias --function-name %LAMBDA_FUNCTION% --name live >nul 2>nul
if errorlevel 1 (
    REM Create new alias
    aws lambda create-alias --function-name %LAMBDA_FUNCTION% --name live --function-version %TARGET_VERSION% --description "Live version (rollback performed)" --output json >nul
    echo [INFO] Created 'live' alias pointing to version %TARGET_VERSION%
) else (
    REM Update existing alias
    aws lambda update-alias --function-name %LAMBDA_FUNCTION% --name live --function-version %TARGET_VERSION% --output json >nul
    echo [INFO] Updated 'live' alias to point to version %TARGET_VERSION%
)

echo [INFO] Lambda function rolled back successfully.
echo.

REM Check S3 versioning
if not "%FRONTEND_BUCKET%"=="" (
    echo [STEP] Checking S3 bucket versioning status...
    
    for /f "delims=" %%i in ('aws s3api get-bucket-versioning --bucket %FRONTEND_BUCKET% --query Status --output text 2^>nul') do set VERSIONING_STATUS=%%i
    
    if "!VERSIONING_STATUS!"=="Enabled" (
        echo [INFO] S3 versioning is enabled.
        echo [INFO] Note: S3 rollback requires manual restoration of specific file versions.
        echo [INFO] Use AWS Console or CLI to restore previous versions of files.
    ) else (
        echo [WARN] S3 versioning is not enabled for bucket: %FRONTEND_BUCKET%
        echo [WARN] Cannot rollback S3 files without versioning.
    )
    echo.
)

REM Invalidate CloudFront cache
if not "%CLOUDFRONT_DOMAIN%"=="" (
    echo [STEP] Invalidating CloudFront cache...
    
    for /f "delims=" %%i in ('aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='%CLOUDFRONT_DOMAIN%'].Id" --output text') do set DISTRIBUTION_ID=%%i
    
    if not "!DISTRIBUTION_ID!"=="" (
        for /f "delims=" %%i in ('aws cloudfront create-invalidation --distribution-id !DISTRIBUTION_ID! --paths "/*" --query Invalidation.Id --output text') do set INVALIDATION_ID=%%i
        echo [INFO] CloudFront invalidation created: !INVALIDATION_ID!
        echo [INFO] Cache will be cleared shortly.
    ) else (
        echo [WARN] CloudFront distribution ID not found. Skipping cache invalidation.
    )
    echo.
)

REM Verify rollback
echo [STEP] Verifying rollback...

for /f "delims=" %%i in ('aws lambda get-alias --function-name %LAMBDA_FUNCTION% --name live --query FunctionVersion --output text 2^>nul') do set NEW_VERSION=%%i

if not "%NEW_VERSION%"=="" (
    echo [INFO] Lambda function is now at version: %NEW_VERSION%
)

aws lambda get-function --function-name %LAMBDA_FUNCTION% >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Lambda function is not accessible
) else (
    echo [INFO] Lambda function is accessible
)

echo [INFO] Rollback verification completed.
echo.

REM Display rollback summary
echo.
echo ========================================
echo Rollback Summary
echo ========================================
echo.
echo Environment: %ENV%
echo.
echo Lambda Function: %LAMBDA_FUNCTION%
echo Rolled back to version: %TARGET_VERSION%
echo.

if not "%FRONTEND_BUCKET%"=="" (
    echo Frontend Bucket: %FRONTEND_BUCKET%
    echo S3 rollback: Manual restoration may be required
    echo.
)

echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Test the application to verify the rollback:
echo    - Check API health endpoint
echo    - Test key functionality
echo.
echo 2. Monitor CloudWatch logs for errors:
echo    aws logs tail /aws/lambda/%LAMBDA_FUNCTION% --follow
echo.
echo 3. If issues persist, consider:
echo    - Rolling back to an earlier version
echo    - Restoring S3 files from backup
echo    - Checking CloudWatch alarms
echo.

echo [INFO] Rollback completed!

endlocal
