#!/bin/bash
# Application deployment script for Digital Twin Chat
# Builds and deploys both backend (Lambda) and frontend (S3/CloudFront)

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Python is installed
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please run 'aws configure'."
        exit 1
    fi
    
    print_info "All prerequisites met."
}

# Function to validate environment parameter
validate_environment() {
    local env=$1
    if [[ "$env" != "staging" && "$env" != "production" ]]; then
        print_error "Invalid environment: $env. Must be 'staging' or 'production'."
        exit 1
    fi
}

# Function to load deployment outputs
load_outputs() {
    local env=$1
    local outputs_file="outputs-$env.json"
    
    if [ ! -f "$outputs_file" ]; then
        print_error "Outputs file not found: $outputs_file"
        print_error "Please run deploy-infrastructure.sh first."
        exit 1
    fi
    
    print_info "Loading deployment outputs from $outputs_file..."
    
    # Extract outputs using jq
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it: sudo apt-get install jq (Linux) or brew install jq (macOS)"
        exit 1
    fi
    
    FRONTEND_BUCKET=$(jq -r '.[].FrontendBucketName' "$outputs_file" 2>/dev/null || echo "")
    MEMORY_BUCKET=$(jq -r '.[].MemoryBucketName' "$outputs_file" 2>/dev/null || echo "")
    API_ENDPOINT=$(jq -r '.[].ApiEndpoint' "$outputs_file" 2>/dev/null || echo "")
    CLOUDFRONT_DOMAIN=$(jq -r '.[].CloudFrontDomain' "$outputs_file" 2>/dev/null || echo "")
    LAMBDA_FUNCTION=$(jq -r '.[].LambdaFunctionName' "$outputs_file" 2>/dev/null || echo "")
    
    # Get CloudFront distribution ID
    if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        print_info "Looking up CloudFront distribution ID..."
        DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$CLOUDFRONT_DOMAIN'].Id" --output text 2>/dev/null || echo "")
    fi
    
    # Validate required outputs
    if [ -z "$FRONTEND_BUCKET" ] || [ -z "$LAMBDA_FUNCTION" ]; then
        print_error "Required outputs not found in $outputs_file"
        exit 1
    fi
    
    print_info "Outputs loaded successfully."
}

# Function to package Lambda function
package_lambda() {
    print_info "Packaging Lambda function..."
    
    cd ../backend
    
    # Create deployment package directory
    rm -rf lambda-package
    mkdir -p lambda-package
    
    # Copy application code
    print_info "Copying application code..."
    cp *.py lambda-package/ 2>/dev/null || true
    
    # Install dependencies
    print_info "Installing Python dependencies..."
    pip install -q -r requirements.txt -t lambda-package/
    
    # Create zip file
    print_info "Creating deployment package..."
    cd lambda-package
    zip -q -r ../lambda-deployment.zip .
    cd ..
    
    print_info "Lambda package created: backend/lambda-deployment.zip"
    
    cd ../infrastructure
}

# Function to deploy Lambda function
deploy_lambda() {
    print_info "Deploying Lambda function..."
    
    # Update Lambda function code
    aws lambda update-function-code \
        --function-name "$LAMBDA_FUNCTION" \
        --zip-file fileb://../backend/lambda-deployment.zip \
        --output json > /dev/null
    
    print_info "Waiting for Lambda function to be updated..."
    aws lambda wait function-updated --function-name "$LAMBDA_FUNCTION"
    
    print_info "Lambda function deployed successfully."
}

# Function to build frontend
build_frontend() {
    print_info "Building frontend..."
    
    cd ../frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node.js dependencies..."
        npm install
    fi
    
    # Set API endpoint environment variable
    if [ -n "$API_ENDPOINT" ]; then
        export NEXT_PUBLIC_API_URL="$API_ENDPOINT"
        print_info "API endpoint set to: $API_ENDPOINT"
    fi
    
    # Build Next.js static export
    print_info "Running Next.js build..."
    npm run build
    
    # Verify output
    if [ ! -d "out" ]; then
        print_error "Build failed: output directory 'out' not found."
        exit 1
    fi
    
    print_info "Frontend build completed successfully."
    
    cd ../infrastructure
}

# Function to deploy frontend to S3
deploy_frontend() {
    print_info "Deploying frontend to S3..."
    
    # Sync files to S3
    aws s3 sync ../frontend/out/ "s3://$FRONTEND_BUCKET/" \
        --delete \
        --cache-control "public, max-age=31536000, immutable" \
        --exclude "index.html" \
        --exclude "*.html"
    
    # Upload HTML files with no-cache
    aws s3 sync ../frontend/out/ "s3://$FRONTEND_BUCKET/" \
        --exclude "*" \
        --include "*.html" \
        --cache-control "public, max-age=0, must-revalidate"
    
    print_info "Frontend deployed to S3: $FRONTEND_BUCKET"
}

# Function to invalidate CloudFront cache
invalidate_cloudfront() {
    if [ -z "$DISTRIBUTION_ID" ]; then
        print_warn "CloudFront distribution ID not found. Skipping cache invalidation."
        return 0
    fi
    
    print_info "Invalidating CloudFront cache..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    print_info "CloudFront invalidation created: $INVALIDATION_ID"
    print_info "Waiting for invalidation to complete (this may take a few minutes)..."
    
    aws cloudfront wait invalidation-completed \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID" || print_warn "Invalidation wait timed out. Check status manually."
    
    print_info "CloudFront cache invalidated successfully."
}

# Function to upload persona file if it doesn't exist
upload_persona_if_needed() {
    if [ -z "$MEMORY_BUCKET" ]; then
        print_warn "Memory bucket not found. Skipping persona file check."
        return 0
    fi
    
    print_info "Checking if persona file exists in S3..."
    
    if aws s3 ls "s3://$MEMORY_BUCKET/me.txt" &> /dev/null; then
        print_info "Persona file already exists in S3."
    else
        if [ -f "../backend/me.txt" ]; then
            print_info "Uploading persona file to S3..."
            aws s3 cp ../backend/me.txt "s3://$MEMORY_BUCKET/me.txt"
            print_info "Persona file uploaded."
        else
            print_warn "Persona file not found at ../backend/me.txt"
            print_warn "Please upload it manually: aws s3 cp me.txt s3://$MEMORY_BUCKET/me.txt"
        fi
    fi
}

# Function to run post-deployment tests
run_post_deployment_tests() {
    print_info "Running post-deployment tests..."
    
    # Test 1: Check Lambda function
    print_info "Test 1: Checking Lambda function..."
    if aws lambda get-function --function-name "$LAMBDA_FUNCTION" &> /dev/null; then
        print_info "✓ Lambda function is accessible"
    else
        print_error "✗ Lambda function not accessible"
        return 1
    fi
    
    # Test 2: Check API health endpoint
    print_info "Test 2: Checking API health endpoint..."
    local health_url="${API_ENDPOINT}api/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        print_info "✓ API health endpoint responding"
    else
        print_warn "✗ API health endpoint returned status: $response"
    fi
    
    # Test 3: Check frontend in S3
    print_info "Test 3: Checking frontend deployment..."
    if aws s3 ls "s3://$FRONTEND_BUCKET/index.html" &> /dev/null; then
        print_info "✓ Frontend deployed to S3"
    else
        print_error "✗ Frontend index.html not found in S3"
        return 1
    fi
    
    # Test 4: Check CloudFront distribution
    if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        print_info "Test 4: Checking CloudFront distribution..."
        local cf_response=$(curl -s -o /dev/null -w "%{http_code}" "https://$CLOUDFRONT_DOMAIN/" 2>/dev/null || echo "000")
        
        if [ "$cf_response" = "200" ]; then
            print_info "✓ CloudFront distribution responding"
        else
            print_warn "✗ CloudFront returned status: $cf_response (may need time to propagate)"
        fi
    fi
    
    print_info "Post-deployment tests completed."
}

# Function to display deployment summary
display_deployment_summary() {
    local env=$1
    
    echo ""
    echo "========================================"
    echo "Deployment Summary"
    echo "========================================"
    echo ""
    echo "Environment: $env"
    echo ""
    echo "Backend:"
    echo "  Lambda Function: $LAMBDA_FUNCTION"
    echo "  API Endpoint: $API_ENDPOINT"
    echo ""
    echo "Frontend:"
    echo "  S3 Bucket: $FRONTEND_BUCKET"
    if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        echo "  CloudFront Domain: https://$CLOUDFRONT_DOMAIN"
    fi
    echo ""
    echo "Storage:"
    echo "  Memory Bucket: $MEMORY_BUCKET"
    echo ""
    echo "========================================"
    echo "Application URLs"
    echo "========================================"
    echo ""
    if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        echo "Frontend: https://$CLOUDFRONT_DOMAIN"
    fi
    echo "API: ${API_ENDPOINT}api/health"
    echo ""
    echo "========================================"
    echo "Next Steps"
    echo "========================================"
    echo ""
    echo "1. Verify the application is working:"
    if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        echo "   Open: https://$CLOUDFRONT_DOMAIN"
    fi
    echo ""
    echo "2. Check API health:"
    echo "   curl ${API_ENDPOINT}api/health"
    echo ""
    echo "3. Monitor logs in CloudWatch:"
    echo "   aws logs tail /aws/lambda/$LAMBDA_FUNCTION --follow"
    echo ""
}

# Main script
main() {
    echo "========================================"
    echo "Digital Twin Chat - Application Deployment"
    echo "========================================"
    echo ""
    
    # Parse arguments
    ENV=${1:-}
    
    # Validate environment
    if [ -z "$ENV" ]; then
        print_error "Usage: $0 <staging|production>"
        print_error "Example: $0 staging"
        exit 1
    fi
    
    validate_environment "$ENV"
    
    print_info "Environment: $ENV"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Load deployment outputs
    load_outputs "$ENV"
    
    # Package and deploy Lambda function
    package_lambda
    deploy_lambda
    
    # Build and deploy frontend
    build_frontend
    deploy_frontend
    
    # Invalidate CloudFront cache
    invalidate_cloudfront
    
    # Upload persona file if needed
    upload_persona_if_needed
    
    # Run post-deployment tests
    if ! run_post_deployment_tests; then
        print_warn "Some post-deployment tests failed. Please verify manually."
    fi
    
    # Display deployment summary
    display_deployment_summary "$ENV"
    
    print_info "Application deployment completed successfully!"
}

# Run main function
main "$@"
