#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d frontend/node_modules ]]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

if [[ ! -d frontend/dist ]]; then
  echo "Building frontend..."
  (cd frontend && npm run build)
fi

echo "Starting API + UI at http://localhost:${PORT:-8000}"
exec python server.py
