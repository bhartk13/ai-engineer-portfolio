#!/bin/bash
# Rollback script for Digital Twin Chat
# Rolls back Lambda function to previous version and optionally restores S3 frontend files

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
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
        print_error "Cannot determine resource names for rollback."
        exit 1
    fi
    
    print_info "Loading deployment outputs from $outputs_file..."
    
    # Extract outputs using jq
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it: sudo apt-get install jq (Linux) or brew install jq (macOS)"
        exit 1
    fi
    
    FRONTEND_BUCKET=$(jq -r '.[].FrontendBucketName' "$outputs_file" 2>/dev/null || echo "")
    LAMBDA_FUNCTION=$(jq -r '.[].LambdaFunctionName' "$outputs_file" 2>/dev/null || echo "")
    CLOUDFRONT_DOMAIN=$(jq -r '.[].CloudFrontDomain' "$outputs_file" 2>/dev/null || echo "")
    
    # Get CloudFront distribution ID
    if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$CLOUDFRONT_DOMAIN'].Id" --output text 2>/dev/null || echo "")
    fi
    
    # Validate required outputs
    if [ -z "$LAMBDA_FUNCTION" ]; then
        print_error "Lambda function name not found in $outputs_file"
        exit 1
    fi
    
    print_info "Outputs loaded successfully."
}

# Function to list Lambda versions
list_lambda_versions() {
    print_step "Listing available Lambda versions..."
    
    # Get all versions
    VERSIONS=$(aws lambda list-versions-by-function \
        --function-name "$LAMBDA_FUNCTION" \
        --query 'Versions[?Version!=`$LATEST`].[Version,LastModified,Description]' \
        --output text)
    
    if [ -z "$VERSIONS" ]; then
        print_error "No previous versions found for Lambda function: $LAMBDA_FUNCTION"
        exit 1
    fi
    
    echo ""
    echo "Available versions:"
    echo "-------------------"
    echo "$VERSIONS" | awk '{printf "Version: %-5s  Modified: %-25s  Description: %s\n", $1, $2" "$3, $4}'
    echo ""
}

# Function to get current Lambda version
get_current_lambda_version() {
    print_info "Getting current Lambda version..."
    
    CURRENT_VERSION=$(aws lambda get-alias \
        --function-name "$LAMBDA_FUNCTION" \
        --name "live" \
        --query 'FunctionVersion' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$CURRENT_VERSION" ]; then
        # If no alias exists, get the $LATEST version info
        CURRENT_VERSION=$(aws lambda get-function \
            --function-name "$LAMBDA_FUNCTION" \
            --query 'Configuration.Version' \
            --output text)
        print_info "Current version: $CURRENT_VERSION (no alias configured)"
    else
        print_info "Current version (via 'live' alias): $CURRENT_VERSION"
    fi
}

# Function to rollback Lambda function
rollback_lambda() {
    local target_version=$1
    
    print_step "Rolling back Lambda function to version $target_version..."
    
    # Verify the target version exists
    if ! aws lambda get-function \
        --function-name "$LAMBDA_FUNCTION" \
        --qualifier "$target_version" &> /dev/null; then
        print_error "Version $target_version does not exist for function $LAMBDA_FUNCTION"
        exit 1
    fi
    
    # Update the alias or function configuration
    if aws lambda get-alias --function-name "$LAMBDA_FUNCTION" --name "live" &> /dev/null; then
        # Update existing alias
        aws lambda update-alias \
            --function-name "$LAMBDA_FUNCTION" \
            --name "live" \
            --function-version "$target_version" \
            --output json > /dev/null
        print_info "Updated 'live' alias to point to version $target_version"
    else
        # Create new alias
        aws lambda create-alias \
            --function-name "$LAMBDA_FUNCTION" \
            --name "live" \
            --function-version "$target_version" \
            --description "Live version (rollback performed)" \
            --output json > /dev/null
        print_info "Created 'live' alias pointing to version $target_version"
    fi
    
    print_info "Lambda function rolled back successfully."
}

# Function to list S3 versions
list_s3_versions() {
    if [ -z "$FRONTEND_BUCKET" ]; then
        print_warn "Frontend bucket not found. Skipping S3 version listing."
        return 1
    fi
    
    print_step "Checking S3 bucket versioning status..."
    
    # Check if versioning is enabled
    VERSIONING_STATUS=$(aws s3api get-bucket-versioning \
        --bucket "$FRONTEND_BUCKET" \
        --query 'Status' \
        --output text 2>/dev/null || echo "")
    
    if [ "$VERSIONING_STATUS" != "Enabled" ]; then
        print_warn "S3 versioning is not enabled for bucket: $FRONTEND_BUCKET"
        print_warn "Cannot rollback S3 files without versioning."
        return 1
    fi
    
    print_info "S3 versioning is enabled."
    print_info "Note: S3 rollback requires manual restoration of specific file versions."
    print_info "Use AWS Console or CLI to restore previous versions of files."
    
    return 0
}

# Function to restore S3 files from backup
restore_s3_from_backup() {
    if [ -z "$FRONTEND_BUCKET" ]; then
        print_warn "Frontend bucket not found. Skipping S3 restore."
        return 1
    fi
    
    print_step "Checking for S3 backup..."
    
    # Check if backup exists
    local backup_prefix="backups/$(date +%Y-%m-%d)"
    
    if aws s3 ls "s3://$FRONTEND_BUCKET/$backup_prefix/" &> /dev/null; then
        print_info "Backup found at: s3://$FRONTEND_BUCKET/$backup_prefix/"
        
        read -p "Do you want to restore from this backup? (y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Restoring files from backup..."
            
            # Sync backup to root
            aws s3 sync "s3://$FRONTEND_BUCKET/$backup_prefix/" "s3://$FRONTEND_BUCKET/" \
                --delete \
                --exclude "backups/*"
            
            print_info "Files restored from backup."
            return 0
        else
            print_info "Skipping S3 restore."
            return 1
        fi
    else
        print_warn "No backup found for today. Cannot restore S3 files automatically."
        print_info "You can manually restore files using S3 versioning or previous backups."
        return 1
    fi
}

# Function to invalidate CloudFront cache
invalidate_cloudfront() {
    if [ -z "$DISTRIBUTION_ID" ]; then
        print_warn "CloudFront distribution ID not found. Skipping cache invalidation."
        return 0
    fi
    
    print_step "Invalidating CloudFront cache..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    print_info "CloudFront invalidation created: $INVALIDATION_ID"
    print_info "Cache will be cleared shortly."
}

# Function to verify rollback
verify_rollback() {
    print_step "Verifying rollback..."
    
    # Verify Lambda version
    local current_version=$(aws lambda get-alias \
        --function-name "$LAMBDA_FUNCTION" \
        --name "live" \
        --query 'FunctionVersion' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$current_version" ]; then
        print_info "✓ Lambda function is now at version: $current_version"
    fi
    
    # Test Lambda function
    if aws lambda get-function --function-name "$LAMBDA_FUNCTION" &> /dev/null; then
        print_info "✓ Lambda function is accessible"
    else
        print_error "✗ Lambda function is not accessible"
    fi
    
    print_info "Rollback verification completed."
}

# Function to display rollback summary
display_rollback_summary() {
    local env=$1
    local lambda_version=$2
    
    echo ""
    echo "========================================"
    echo "Rollback Summary"
    echo "========================================"
    echo ""
    echo "Environment: $env"
    echo ""
    echo "Lambda Function: $LAMBDA_FUNCTION"
    echo "Rolled back to version: $lambda_version"
    echo ""
    
    if [ -n "$FRONTEND_BUCKET" ]; then
        echo "Frontend Bucket: $FRONTEND_BUCKET"
        echo "S3 rollback: Manual restoration may be required"
        echo ""
    fi
    
    echo "========================================"
    echo "Next Steps"
    echo "========================================"
    echo ""
    echo "1. Test the application to verify the rollback:"
    echo "   - Check API health endpoint"
    echo "   - Test key functionality"
    echo ""
    echo "2. Monitor CloudWatch logs for errors:"
    echo "   aws logs tail /aws/lambda/$LAMBDA_FUNCTION --follow"
    echo ""
    echo "3. If issues persist, consider:"
    echo "   - Rolling back to an earlier version"
    echo "   - Restoring S3 files from backup"
    echo "   - Checking CloudWatch alarms"
    echo ""
}

# Main script
main() {
    echo "========================================"
    echo "Digital Twin Chat - Rollback"
    echo "========================================"
    echo ""
    
    # Parse arguments
    ENV=${1:-}
    TARGET_VERSION=${2:-}
    
    # Validate environment
    if [ -z "$ENV" ]; then
        print_error "Usage: $0 <staging|production> [lambda-version]"
        print_error "Example: $0 staging 3"
        print_error ""
        print_error "If lambda-version is not provided, you will be prompted to select one."
        exit 1
    fi
    
    validate_environment "$ENV"
    
    print_info "Environment: $ENV"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Load deployment outputs
    load_outputs "$ENV"
    
    # Get current Lambda version
    get_current_lambda_version
    
    # If target version not provided, list versions and prompt
    if [ -z "$TARGET_VERSION" ]; then
        list_lambda_versions
        
        read -p "Enter the version number to rollback to: " TARGET_VERSION
        
        if [ -z "$TARGET_VERSION" ]; then
            print_error "No version specified. Aborting rollback."
            exit 1
        fi
    fi
    
    # Confirm rollback
    echo ""
    print_warn "You are about to rollback the following:"
    echo "  Environment: $ENV"
    echo "  Lambda Function: $LAMBDA_FUNCTION"
    echo "  Target Version: $TARGET_VERSION"
    echo ""
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Rollback cancelled."
        exit 0
    fi
    
    # Perform Lambda rollback
    rollback_lambda "$TARGET_VERSION"
    
    # Check S3 versioning and offer restore
    if list_s3_versions; then
        echo ""
        read -p "Do you want to attempt S3 file restoration? (y/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            restore_s3_from_backup || print_warn "S3 restoration skipped or failed."
        fi
    fi
    
    # Invalidate CloudFront cache
    invalidate_cloudfront
    
    # Verify rollback
    verify_rollback
    
    # Display rollback summary
    display_rollback_summary "$ENV" "$TARGET_VERSION"
    
    print_info "Rollback completed!"
}

# Run main function
main "$@"
