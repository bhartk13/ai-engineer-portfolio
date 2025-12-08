@echo off
REM Quick setup script for Digital Twin Chat secrets and configuration

echo ========================================
echo Digital Twin Chat - Secrets Setup
echo ========================================
echo.

REM Check if OpenAI API key is provided
if "%1"=="" (
    echo [ERROR] Usage: %0 YOUR_OPENAI_API_KEY
    echo [ERROR] Example: %0 sk-proj-abc123...
    echo.
    echo Get your OpenAI API key from: https://platform.openai.com/api-keys
    exit /b 1
)

set OPENAI_KEY=%1
set SECRET_NAME=digital-twin-chat/staging/llm-api-key
set S3_BUCKET=digitaltwinchatstack-stag-storagememorybucketb6928-xjs1cjqcvagm

echo [INFO] Step 1: Creating/Updating secret in AWS Secrets Manager...
echo.

REM Try to create the secret (will fail if it already exists)
aws secretsmanager create-secret ^
  --name %SECRET_NAME% ^
  --description "OpenAI API key for Digital Twin Chat staging" ^
  --secret-string "{\"openai_api_key\":\"%OPENAI_KEY%\"}" ^
  >nul 2>nul

if errorlevel 1 (
    echo [INFO] Secret already exists, updating...
    aws secretsmanager put-secret-value ^
      --secret-id %SECRET_NAME% ^
      --secret-string "{\"openai_api_key\":\"%OPENAI_KEY%\"}"
    
    if errorlevel 1 (
        echo [ERROR] Failed to update secret
        exit /b 1
    )
    echo [SUCCESS] Secret updated successfully!
) else (
    echo [SUCCESS] Secret created successfully!
)

echo.
echo [INFO] Step 2: Uploading persona file to S3...
echo.

REM Check if me.txt exists
if exist backend\me.txt (
    aws s3 cp backend\me.txt s3://%S3_BUCKET%/me.txt
    if errorlevel 1 (
        echo [ERROR] Failed to upload me.txt
        exit /b 1
    )
    echo [SUCCESS] Persona file uploaded successfully!
) else (
    echo [WARN] backend\me.txt not found
    echo [INFO] You can upload it later with:
    echo       aws s3 cp backend\me.txt s3://%S3_BUCKET%/me.txt
)

echo.
echo [INFO] Step 3: Testing API health endpoint...
echo.

timeout /t 3 /nobreak >nul

powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://fm90w0818j.execute-api.us-east-1.amazonaws.com/api/health' -UseBasicParsing; Write-Host '[SUCCESS] API is healthy!'; Write-Host $response.Content } catch { Write-Host '[ERROR] API health check failed:' $_.Exception.Message }"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Your Digital Twin Chat is now configured!
echo.
echo Frontend URL: https://dgc2cjdjejel3.cloudfront.net
echo API Endpoint: https://fm90w0818j.execute-api.us-east-1.amazonaws.com
echo.
echo Next steps:
echo 1. Open the frontend URL in your browser
echo 2. Start chatting with your digital twin!
echo.
echo To view logs:
echo   aws logs tail /aws/lambda/DigitalTwinChatStack-stag-ComputeDigitalTwinChatFu-rk2BQfuMM3pg --follow
echo.

