@echo off
REM Setup and Generate Audio Files for Hindi Learning App
REM This script installs dependencies and generates audio using AWS Polly

echo ============================================================
echo Hindi Learning App - Audio Generation Setup
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://www.python.org/
    pause
    exit /b 1
)

echo Step 1: Installing Python dependencies...
pip install -r audio-generation-requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Checking AWS credentials...
aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo WARNING: AWS credentials not configured
    echo.
    echo Please configure AWS credentials using one of these methods:
    echo   1. Run: aws configure
    echo   2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
    echo   3. Create ~/.aws/credentials file
    echo.
    echo See AUDIO_GENERATION_GUIDE.md for detailed instructions
    echo.
    pause
    exit /b 1
)
echo AWS credentials found!
echo.

echo Step 3: Generating audio files with AWS Polly...
python generate_audio_polly.py
if errorlevel 1 (
    echo ERROR: Audio generation failed
    pause
    exit /b 1
)
echo.

echo Step 4: Rebuilding application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

echo ============================================================
echo SUCCESS! Audio files generated and application rebuilt
echo ============================================================
echo.
echo Next steps:
echo   1. Test the app: npm run dev
echo   2. Open http://localhost:5173/ in your browser
echo   3. Click on characters and words to hear the audio
echo.
pause
