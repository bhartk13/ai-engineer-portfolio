@echo off
REM Build Lambda deployment package using Docker for Linux compatibility

echo [INFO] Building Lambda package using Docker...

REM Check if Docker is available
where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo [ERROR] Please install Docker Desktop for Windows.
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop.
    exit /b 1
)

cd ..\backend

REM Clean up previous builds
if exist lambda-package rmdir /s /q lambda-package
if exist lambda-deployment.zip del /f lambda-deployment.zip

echo [INFO] Creating Lambda package using Docker...

REM Use Amazon Linux 2 image that matches Lambda runtime
docker run --rm ^
  -v "%CD%":/var/task ^
  public.ecr.aws/lambda/python:3.11 ^
  /bin/bash -c "pip install -r requirements.txt -t /var/task/lambda-package/ && cp *.py /var/task/lambda-package/"

if errorlevel 1 (
    echo [ERROR] Docker build failed
    cd ..\infrastructure
    exit /b 1
)

echo [INFO] Creating ZIP archive...
cd lambda-package
powershell -Command "Compress-Archive -Path * -DestinationPath ..\lambda-deployment.zip -Force"
cd ..

echo [INFO] Lambda package created: backend\lambda-deployment.zip

REM Clean up
rmdir /s /q lambda-package

cd ..\infrastructure

echo [INFO] Lambda package build completed successfully!
