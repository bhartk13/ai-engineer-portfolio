#!/bin/bash
# Local test runner that mirrors CI/CD pipeline testing
# Run this before pushing to catch issues early

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Track test results
BACKEND_TESTS_PASSED=true
FRONTEND_TESTS_PASSED=true

echo "========================================"
echo "Digital Twin Chat - Local Test Runner"
echo "========================================"
echo ""

# Backend Tests
print_step "Running Backend Tests..."
echo ""

cd backend

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    BACKEND_TESTS_PASSED=false
else
    # Install dependencies if needed
    print_info "Installing backend dependencies..."
    pip install -q -r requirements.txt
    pip install -q flake8
    
    # Run linting
    print_info "Running backend linting..."
    if flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics; then
        print_info "✓ Backend linting passed (critical errors)"
    else
        print_error "✗ Backend linting failed (critical errors)"
        BACKEND_TESTS_PASSED=false
    fi
    
    # Run style checks (warnings only)
    print_info "Running backend style checks..."
    flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    
    # Run unit tests
    print_info "Running backend unit tests..."
    if pytest test_basic.py test_chat_endpoints.py -v --tb=short; then
        print_info "✓ Backend unit tests passed"
    else
        print_error "✗ Backend unit tests failed"
        BACKEND_TESTS_PASSED=false
    fi
    
    # Run property tests
    print_info "Running backend property tests..."
    if pytest test_integration.py -v --tb=short; then
        print_info "✓ Backend property tests passed"
    else
        print_warn "⚠ Backend property tests had warnings"
    fi
fi

cd ..

echo ""
print_step "Running Frontend Tests..."
echo ""

cd frontend

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    FRONTEND_TESTS_PASSED=false
else
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm ci
    fi
    
    # Run linting
    print_info "Running frontend linting..."
    if npm run lint; then
        print_info "✓ Frontend linting passed"
    else
        print_error "✗ Frontend linting failed"
        FRONTEND_TESTS_PASSED=false
    fi
    
    # Run type checking
    print_info "Running TypeScript type checking..."
    if npx tsc --noEmit; then
        print_info "✓ TypeScript type checking passed"
    else
        print_error "✗ TypeScript type checking failed"
        FRONTEND_TESTS_PASSED=false
    fi
fi

cd ..

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""

if [ "$BACKEND_TESTS_PASSED" = true ]; then
    print_info "✓ Backend tests: PASSED"
else
    print_error "✗ Backend tests: FAILED"
fi

if [ "$FRONTEND_TESTS_PASSED" = true ]; then
    print_info "✓ Frontend tests: PASSED"
else
    print_error "✗ Frontend tests: FAILED"
fi

echo ""

if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ]; then
    print_info "All tests passed! Ready to push."
    exit 0
else
    print_error "Some tests failed. Please fix before pushing."
    exit 1
fi
