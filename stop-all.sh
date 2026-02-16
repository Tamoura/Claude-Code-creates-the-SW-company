#!/bin/bash
# ConnectSW — Stop All Products
# Usage: ./stop-all.sh [product1 product2 ...]
#
# Examples:
#   ./stop-all.sh                    # Stop everything
#   ./stop-all.sh qdb-one muaththir  # Stop specific products only

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

FILTER=("$@")

# All known ports: web and api
declare -A PORT_MAP=(
  ["quantum-computing-usecases-web"]=3100
  ["qdb-one-web"]=3102
  ["stablecoin-gateway-web"]=3104
  ["stablecoin-gateway-api"]=5001
  ["muaththir-web"]=3108
  ["muaththir-api"]=5005
  ["connectgrc-web"]=3110
  ["connectgrc-api"]=5006
  ["taskflow-web"]=3111
  ["taskflow-api"]=5007
  ["recomengine-web"]=3112
  ["recomengine-api"]=5008
  ["command-center-web"]=3113
  ["command-center-api"]=5009
  ["linkedin-agent-web"]=3114
  ["linkedin-agent-api"]=5010
)

should_stop() {
  local key="$1"
  if [ ${#FILTER[@]} -eq 0 ]; then
    return 0
  fi
  local product="${key%-web}"
  product="${product%-api}"
  for f in "${FILTER[@]}"; do
    if [ "$f" = "$product" ]; then
      return 0
    fi
  done
  return 1
}

echo ""
echo -e "${CYAN}ConnectSW — Stopping Products${NC}"
echo ""

stopped=0

for key in $(echo "${!PORT_MAP[@]}" | tr ' ' '\n' | sort); do
  if ! should_stop "$key"; then
    continue
  fi

  port="${PORT_MAP[$key]}"
  pids=$(lsof -ti:"$port" 2>/dev/null || true)

  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    echo -e "  ${RED}STOP${NC} $key (:$port) — killed"
    ((stopped++)) || true
  fi
done

# Also kill any orphaned next/vite processes
if [ ${#FILTER[@]} -eq 0 ]; then
  pkill -f "next dev" 2>/dev/null && echo -e "  ${RED}STOP${NC} orphaned next dev processes" || true
  pkill -f "vite --port" 2>/dev/null && echo -e "  ${RED}STOP${NC} orphaned vite processes" || true
fi

echo ""
if [ $stopped -gt 0 ]; then
  echo -e "${GREEN}Stopped $stopped servers.${NC}"
else
  echo -e "${YELLOW}No running servers found.${NC}"
fi
echo ""
