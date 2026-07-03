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

PORT="${PORT:-8000}"
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use (another app is bound to localhost:${PORT})."
  if [[ "${PORT}" == "8000" ]]; then
    PORT=8001
    echo "Falling back to http://localhost:${PORT}"
  else
    echo "Stop the other process or set PORT to a free port, e.g. PORT=8002 ./scripts/run.sh"
    exit 1
  fi
fi

export PORT
echo "Starting API + UI at http://localhost:${PORT}"
exec python server.py
