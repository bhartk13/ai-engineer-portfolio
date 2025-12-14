#!/bin/bash
# Setup and Generate Audio Files for Hindi Learning App
# This script installs dependencies and generates audio using AWS Polly

set -e  # Exit on error

echo "============================================================"
echo "Hindi Learning App - Audio Generation Setup"
echo "============================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.7+ from https://www.python.org/"
    exit 1
fi

echo "Step 1: Installing Python dependencies..."
pip3 install -r audio-generation-requirements.txt
echo ""

echo "Step 2: Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "WARNING: AWS credentials not configured"
    echo ""
    echo "Please configure AWS credentials using one of these methods:"
    echo "  1. Run: aws configure"
    echo "  2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
    echo "  3. Create ~/.aws/credentials file"
    echo ""
    echo "See AUDIO_GENERATION_GUIDE.md for detailed instructions"
    echo ""
    exit 1
fi
echo "AWS credentials found!"
echo ""

echo "Step 3: Generating audio files with AWS Polly..."
python3 generate_audio_polly.py
echo ""

echo "Step 4: Rebuilding application..."
npm run build
echo ""

echo "============================================================"
echo "SUCCESS! Audio files generated and application rebuilt"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Test the app: npm run dev"
echo "  2. Open http://localhost:5173/ in your browser"
echo "  3. Click on characters and words to hear the audio"
echo ""
