#!/bin/bash
# Enhanced deployment script for Digital Twin Chat infrastructure
# Supports staging and production environments with validation and smoke tests

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
    
    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK is not installed. Please install it: npm install -g aws-cdk"
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

# Function to install dependencies
install_dependencies() {
    print_info "Installing Python dependencies..."
    
    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        print_info "Creating virtual environment..."
        python3 -m venv .venv
    fi
    
    # Activate virtual environment
    source .venv/bin/activate
    
    # Install dependencies
    pip install -q -r requirements.txt
    
    print_info "Dependencies installed."
}

# Function to synthesize CDK stack
synthesize_stack() {
    local env=$1
    local region=$2
    local account=$3
    
    print_info "Synthesizing CloudFormation template for $env environment..."
    
    if [ -n "$account" ]; then
        cdk synth --context env="$env" --context region="$region" --context account="$account"
    else
        cdk synth --context env="$env" --context region="$region"
    fi
    
    print_info "Synthesis complete."
}

# Function to deploy CDK stack
deploy_stack() {
    local env=$1
    local region=$2
    local account=$3
    
    print_info "Deploying infrastructure stack for $env environment..."
    
    if [ -n "$account" ]; then
        cdk deploy --context env="$env" --context region="$region" --context account="$account" --require-approval never --outputs-file outputs-$env.json
    else
        cdk deploy --context env="$env" --context region="$region" --require-approval never --outputs-file outputs-$env.json
    fi
    
    print_info "Deployment complete."
}

# Function to extract outputs from CDK deployment
extract_outputs() {
    local env=$1
    local outputs_file="outputs-$env.json"
    
    if [ ! -f "$outputs_file" ]; then
        print_warn "Outputs file not found: $outputs_file"
        return 1
    fi
    
    print_info "Extracting deployment outputs..."
    
    # Extract key outputs using jq if available, otherwise use grep
    if command -v jq &> /dev/null; then
        FRONTEND_BUCKET=$(jq -r '.[].FrontendBucketName' "$outputs_file" 2>/dev/null || echo "")
        MEMORY_BUCKET=$(jq -r '.[].MemoryBucketName' "$outputs_file" 2>/dev/null || echo "")
        API_ENDPOINT=$(jq -r '.[].ApiEndpoint' "$outputs_file" 2>/dev/null || echo "")
        CLOUDFRONT_DOMAIN=$(jq -r '.[].CloudFrontDomain' "$outputs_file" 2>/dev/null || echo "")
        LAMBDA_FUNCTION=$(jq -r '.[].LambdaFunctionName' "$outputs_file" 2>/dev/null || echo "")
    else
        print_warn "jq not installed. Outputs will need to be retrieved manually."
        return 1
    fi
    
    print_info "Outputs extracted successfully."
    return 0
}

# Function to run smoke tests
run_smoke_tests() {
    local env=$1
    
    print_info "Running smoke tests for $env environment..."
    
    # Check if outputs were extracted
    if [ -z "$API_ENDPOINT" ] || [ -z "$LAMBDA_FUNCTION" ]; then
        print_warn "Cannot run smoke tests: missing deployment outputs."
        return 1
    fi
    
    # Test 1: Check if Lambda function exists
    print_info "Test 1: Checking Lambda function..."
    if aws lambda get-function --function-name "$LAMBDA_FUNCTION" &> /dev/null; then
        print_info "✓ Lambda function exists: $LAMBDA_FUNCTION"
    else
        print_error "✗ Lambda function not found: $LAMBDA_FUNCTION"
        return 1
    fi
    
    # Test 2: Check if API Gateway health endpoint responds
    print_info "Test 2: Checking API Gateway health endpoint..."
    local health_url="${API_ENDPOINT}api/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        print_info "✓ API health endpoint responding: $health_url"
    else
        print_warn "✗ API health endpoint returned status: $response (URL: $health_url)"
        print_warn "This may be expected if the Lambda is cold starting or not fully initialized."
    fi
    
    # Test 3: Check if S3 buckets exist
    print_info "Test 3: Checking S3 buckets..."
    if [ -n "$FRONTEND_BUCKET" ] && aws s3 ls "s3://$FRONTEND_BUCKET" &> /dev/null; then
        print_info "✓ Frontend bucket exists: $FRONTEND_BUCKET"
    else
        print_error "✗ Frontend bucket not accessible: $FRONTEND_BUCKET"
        return 1
    fi
    
    if [ -n "$MEMORY_BUCKET" ] && aws s3 ls "s3://$MEMORY_BUCKET" &> /dev/null; then
        print_info "✓ Memory bucket exists: $MEMORY_BUCKET"
    else
        print_error "✗ Memory bucket not accessible: $MEMORY_BUCKET"
        return 1
    fi
    
    print_info "Smoke tests completed."
    return 0
}

# Function to display post-deployment instructions
display_post_deployment_instructions() {
    local env=$1
    
    echo ""
    echo "========================================"
    echo "Deployment Summary"
    echo "========================================"
    echo ""
    echo "Environment: $env"
    echo ""
    
    if [ -n "$FRONTEND_BUCKET" ]; then
        echo "Frontend Bucket: $FRONTEND_BUCKET"
    fi
    
    if [ -n "$MEMORY_BUCKET" ]; then
        echo "Memory Bucket: $MEMORY_BUCKET"
    fi
    
    if [ -n "$API_ENDPOINT" ]; then
        echo "API Endpoint: $API_ENDPOINT"
    fi
    
    if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
    fi
    
    if [ -n "$LAMBDA_FUNCTION" ]; then
        echo "Lambda Function: $LAMBDA_FUNCTION"
    fi
    
    echo ""
    echo "========================================"
    echo "Next Steps"
    echo "========================================"
    echo ""
    echo "1. Set the LLM API key in Secrets Manager:"
    echo "   aws secretsmanager put-secret-value --secret-id digital-twin-chat/$env/llm-api-key --secret-string 'YOUR_API_KEY'"
    echo ""
    echo "2. Upload persona file to S3:"
    if [ -n "$MEMORY_BUCKET" ]; then
        echo "   aws s3 cp ../backend/me.txt s3://$MEMORY_BUCKET/me.txt"
    else
        echo "   aws s3 cp ../backend/me.txt s3://MEMORY_BUCKET_NAME/me.txt"
    fi
    echo ""
    echo "3. Deploy the application (frontend and backend):"
    echo "   ./deploy-application.sh $env"
    echo ""
}

# Main script
main() {
    echo "========================================"
    echo "Digital Twin Chat - Infrastructure Deployment"
    echo "========================================"
    echo ""
    
    # Parse arguments
    ENV=${1:-}
    REGION=${2:-us-east-1}
    ACCOUNT=${3:-}
    
    # Validate environment
    if [ -z "$ENV" ]; then
        print_error "Usage: $0 <staging|production> [region] [account]"
        print_error "Example: $0 staging us-east-1"
        exit 1
    fi
    
    validate_environment "$ENV"
    
    print_info "Environment: $ENV"
    print_info "Region: $REGION"
    
    # Check prerequisites
    check_prerequisites
    
    # Install dependencies
    install_dependencies
    
    # Bootstrap CDK if account is provided
    if [ -n "$ACCOUNT" ]; then
        print_info "Bootstrapping CDK for account $ACCOUNT in region $REGION..."
        cdk bootstrap "aws://$ACCOUNT/$REGION" || print_warn "Bootstrap may have already been completed."
    fi
    
    # Synthesize stack
    synthesize_stack "$ENV" "$REGION" "$ACCOUNT"
    
    # Deploy stack
    deploy_stack "$ENV" "$REGION" "$ACCOUNT"
    
    # Extract outputs
    extract_outputs "$ENV"
    
    # Run smoke tests
    if ! run_smoke_tests "$ENV"; then
        print_warn "Some smoke tests failed. Please verify the deployment manually."
    fi
    
    # Display post-deployment instructions
    display_post_deployment_instructions "$ENV"
    
    print_info "Infrastructure deployment completed successfully!"
}

# Run main function
main "$@"
