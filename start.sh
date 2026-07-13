#!/bin/bash
# Start all services for Test Automator

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)/backend"
VENV="$BACKEND_DIR/venv"

echo "=== Starting Backend (port 8000) ==="
nohup "$VENV/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude 'output/**' > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID"

echo "=== Starting Frontend (port 3000) ==="
cd "$(dirname "$0")/frontend" && nohup npm exec vite -- --port 3000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  PID: $FRONTEND_PID"

echo ""
echo "All services started:"
echo "  Backend:     http://localhost:8000"
echo "  Frontend:    http://localhost:3000"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
