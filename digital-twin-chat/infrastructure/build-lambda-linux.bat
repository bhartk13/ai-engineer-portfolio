@echo off
REM Build Lambda deployment package with Linux-compatible binaries

echo [INFO] Building Lambda package with Linux-compatible binaries...

cd ..\backend

REM Clean up previous builds
if exist lambda-package rmdir /s /q lambda-package
if exist lambda-deployment.zip del /f lambda-deployment.zip

mkdir lambda-package

echo [INFO] Copying application code...
copy *.py lambda-package\ >nul 2>nul

echo [INFO] Installing Python dependencies for Linux ARM64 Python 3.12 (manylinux)...
REM Install packages compatible with Lambda's ARM64 Linux environment (Python 3.12)
pip install --platform manylinux2014_aarch64 --python-version 3.12 --only-binary=:all: --target lambda-package -r requirements.txt 2>nul

if errorlevel 1 (
    echo [WARN] Some packages don't have ARM64 Python 3.12 manylinux wheels. Installing normally...
    pip install --target lambda-package -r requirements.txt
)

echo [INFO] Creating ZIP archive...
python ..\infrastructure\create_zip.py lambda-package lambda-deployment.zip

echo [INFO] Lambda package created: lambda-deployment.zip
echo [INFO] Package size:
dir lambda-deployment.zip

cd ..\infrastructure

echo [INFO] Lambda package build completed!
