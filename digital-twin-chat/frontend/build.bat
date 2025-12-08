@echo off
REM Build script for Next.js static export (Windows)
REM This script builds the frontend for deployment to S3/CloudFront

echo ========================================
echo Building Next.js Static Export
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Error: node_modules not found. Please run 'npm install' first.
    exit /b 1
)

REM Run the build
echo Running Next.js build...
call npm run build

REM Check if build was successful
if %ERRORLEVEL% neq 0 (
    echo.
    echo ========================================
    echo Build FAILED
    echo ========================================
    exit /b 1
)

REM Verify output directory exists
if not exist "out\" (
    echo.
    echo Error: Output directory 'out' was not created.
    exit /b 1
)

REM Verify index.html exists
if not exist "out\index.html" (
    echo.
    echo Error: index.html not found in output directory.
    exit /b 1
)

echo.
echo ========================================
echo Build SUCCESSFUL
echo ========================================
echo.
echo Output directory: out\
echo.
echo Contents:
dir /b out\

echo.
echo Next steps:
echo 1. Review the contents of the out\ directory
echo 2. Deploy to S3: aws s3 sync out/ s3://your-bucket-name/
echo 3. Invalidate CloudFront cache if needed
echo.

exit /b 0
