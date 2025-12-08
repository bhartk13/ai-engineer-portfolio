#!/bin/bash
# Build script for Next.js static export (Unix/Linux/macOS)
# This script builds the frontend for deployment to S3/CloudFront

set -e  # Exit on error

echo "========================================"
echo "Building Next.js Static Export"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Error: node_modules not found. Please run 'npm install' first."
    exit 1
fi

# Run the build
echo "Running Next.js build..."
npm run build

# Verify output directory exists
if [ ! -d "out" ]; then
    echo ""
    echo "Error: Output directory 'out' was not created."
    exit 1
fi

# Verify index.html exists
if [ ! -f "out/index.html" ]; then
    echo ""
    echo "Error: index.html not found in output directory."
    exit 1
fi

echo ""
echo "========================================"
echo "Build SUCCESSFUL"
echo "========================================"
echo ""
echo "Output directory: out/"
echo ""
echo "Contents:"
ls -lh out/

echo ""
echo "Next steps:"
echo "1. Review the contents of the out/ directory"
echo "2. Deploy to S3: aws s3 sync out/ s3://your-bucket-name/"
echo "3. Invalidate CloudFront cache if needed"
echo ""

exit 0
