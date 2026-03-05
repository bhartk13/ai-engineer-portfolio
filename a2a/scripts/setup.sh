#!/bin/bash
set -e

echo "Setting up A2A Agent Platform..."

# Check required tools
command -v node >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required"; exit 1; }

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — please edit with your API keys"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete!"
echo ""
echo "Quick start:"
echo "  1. Edit .env with your ANTHROPIC_API_KEY"
echo "  2. npm run dev          # Run locally"
echo "  3. npm run docker:up    # Run with Docker"
echo "  4. npm run k8s:deploy   # Deploy to Kubernetes"
