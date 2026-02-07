#!/bin/bash

# Mu'aththir E2E Test Runner
# Starts both API and Web servers, then runs Playwright tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "========================================"
echo "Mu'aththir E2E Test Runner"
echo "========================================"
echo ""

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup background processes
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    if [ ! -z "$API_PID" ]; then
        echo "Stopping API server (PID: $API_PID)"
        kill $API_PID 2>/dev/null || true
    fi
    if [ ! -z "$WEB_PID" ]; then
        echo "Stopping Web server (PID: $WEB_PID)"
        kill $WEB_PID 2>/dev/null || true
    fi
}

# Trap EXIT to ensure cleanup
trap cleanup EXIT INT TERM

echo -e "${YELLOW}Step 1: Starting API server (port 5005)...${NC}"
cd "$PROJECT_ROOT/apps/api"
npm run dev > /tmp/muaththir-api.log 2>&1 &
API_PID=$!
echo "API server started (PID: $API_PID)"

echo ""
echo -e "${YELLOW}Step 2: Starting Web server (port 3108)...${NC}"
cd "$PROJECT_ROOT/apps/web"
npm run dev > /tmp/muaththir-web.log 2>&1 &
WEB_PID=$!
echo "Web server started (PID: $WEB_PID)"

echo ""
echo -e "${YELLOW}Step 3: Waiting for servers to be ready...${NC}"
echo "Checking API health endpoint..."

# Wait for API to be ready
API_READY=0
for i in {1..30}; do
    if curl -s http://localhost:5005/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}API is ready!${NC}"
        API_READY=1
        break
    fi
    echo -n "."
    sleep 1
done

if [ $API_READY -eq 0 ]; then
    echo -e "${RED}API failed to start. Check logs at /tmp/muaththir-api.log${NC}"
    exit 1
fi

echo "Checking Web server..."

# Wait for Web to be ready
WEB_READY=0
for i in {1..30}; do
    if curl -s http://localhost:3108 > /dev/null 2>&1; then
        echo -e "${GREEN}Web server is ready!${NC}"
        WEB_READY=1
        break
    fi
    echo -n "."
    sleep 1
done

if [ $WEB_READY -eq 0 ]; then
    echo -e "${RED}Web server failed to start. Check logs at /tmp/muaththir-web.log${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Running Playwright tests...${NC}"
cd "$SCRIPT_DIR"

# Check if playwright is installed
if ! npm list @playwright/test > /dev/null 2>&1; then
    echo -e "${YELLOW}Playwright not installed. Installing dependencies...${NC}"
    npm install
    npx playwright install chromium
fi

# Run tests
if npm test; then
    echo ""
    echo -e "${GREEN}========================================"
    echo "All E2E tests passed!"
    echo "========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}========================================"
    echo "E2E tests failed!"
    echo "========================================${NC}"
    echo ""
    echo "Server logs:"
    echo "  API: /tmp/muaththir-api.log"
    echo "  Web: /tmp/muaththir-web.log"
    exit 1
fi
