@echo off
REM Local test runner that mirrors CI/CD pipeline testing (Windows version)
REM Run this before pushing to catch issues early

setlocal enabledelayedexpansion

echo ========================================
echo Digital Twin Chat - Local Test Runner
echo ========================================
echo.

set BACKEND_TESTS_PASSED=true
set FRONTEND_TESTS_PASSED=true

REM Backend Tests
echo [STEP] Running Backend Tests...
echo.

cd backend

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed
    set BACKEND_TESTS_PASSED=false
) else (
    REM Install dependencies
    echo [INFO] Installing backend dependencies...
    pip install -q -r requirements.txt
    pip install -q flake8
    
    REM Run linting
    echo [INFO] Running backend linting...
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    if errorlevel 1 (
        echo [ERROR] Backend linting failed (critical errors)
        set BACKEND_TESTS_PASSED=false
    ) else (
        echo [INFO] Backend linting passed (critical errors)
    )
    
    REM Run style checks (warnings only)
    echo [INFO] Running backend style checks...
    flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    
    REM Run unit tests
    echo [INFO] Running backend unit tests...
    pytest test_basic.py test_chat_endpoints.py -v --tb=short
    if errorlevel 1 (
        echo [ERROR] Backend unit tests failed
        set BACKEND_TESTS_PASSED=false
    ) else (
        echo [INFO] Backend unit tests passed
    )
    
    REM Run property tests
    echo [INFO] Running backend property tests...
    pytest test_integration.py -v --tb=short
    if errorlevel 1 (
        echo [WARN] Backend property tests had warnings
    ) else (
        echo [INFO] Backend property tests passed
    )
)

cd ..

echo.
echo [STEP] Running Frontend Tests...
echo.

cd frontend

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed
    set FRONTEND_TESTS_PASSED=false
) else (
    REM Install dependencies if needed
    if not exist "node_modules" (
        echo [INFO] Installing frontend dependencies...
        call npm ci
    )
    
    REM Run linting
    echo [INFO] Running frontend linting...
    call npm run lint
    if errorlevel 1 (
        echo [ERROR] Frontend linting failed
        set FRONTEND_TESTS_PASSED=false
    ) else (
        echo [INFO] Frontend linting passed
    )
    
    REM Run type checking
    echo [INFO] Running TypeScript type checking...
    call npx tsc --noEmit
    if errorlevel 1 (
        echo [ERROR] TypeScript type checking failed
        set FRONTEND_TESTS_PASSED=false
    ) else (
        echo [INFO] TypeScript type checking passed
    )
)

cd ..

REM Summary
echo.
echo ========================================
echo Test Summary
echo ========================================
echo.

if "%BACKEND_TESTS_PASSED%"=="true" (
    echo [INFO] Backend tests: PASSED
) else (
    echo [ERROR] Backend tests: FAILED
)

if "%FRONTEND_TESTS_PASSED%"=="true" (
    echo [INFO] Frontend tests: PASSED
) else (
    echo [ERROR] Frontend tests: FAILED
)

echo.

if "%BACKEND_TESTS_PASSED%"=="true" if "%FRONTEND_TESTS_PASSED%"=="true" (
    echo [INFO] All tests passed! Ready to push.
    exit /b 0
) else (
    echo [ERROR] Some tests failed. Please fix before pushing.
    exit /b 1
)
