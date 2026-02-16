#!/bin/bash
# ConnectSW — Start All Products
# Usage: ./start-all.sh [--web-only] [--api-only] [product1 product2 ...]
#
# Examples:
#   ./start-all.sh                    # Start everything
#   ./start-all.sh --web-only         # Start only web apps
#   ./start-all.sh qdb-one muaththir  # Start specific products only
#   ./start-all.sh --api-only taskflow # Start only taskflow API

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/tmp/connectsw-logs"
mkdir -p "$LOG_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
WEB_ONLY=false
API_ONLY=false
FILTER=()

for arg in "$@"; do
  case "$arg" in
    --web-only) WEB_ONLY=true ;;
    --api-only) API_ONLY=true ;;
    *) FILTER+=("$arg") ;;
  esac
done

# Product definitions: name|web_port|api_port|web_framework
# web_framework: next, vite, or none
# api_port: port number or "none"
PRODUCTS=(
  "quantum-computing-usecases|3100|none|vite"
  "qdb-one|3102|none|next"
  "stablecoin-gateway|3104|5001|vite"
  "muaththir|3108|5005|next"
  "connectgrc|3110|5006|next"
  "taskflow|3111|5007|next"
  "recomengine|3112|5008|next"
  "command-center|3113|5009|vite"
  "linkedin-agent|3114|5010|next"
)

should_start() {
  local name="$1"
  if [ ${#FILTER[@]} -eq 0 ]; then
    return 0  # No filter = start all
  fi
  for f in "${FILTER[@]}"; do
    if [ "$f" = "$name" ]; then
      return 0
    fi
  done
  return 1
}

is_port_in_use() {
  lsof -ti:"$1" >/dev/null 2>&1
}

start_web() {
  local name="$1" port="$2" framework="$3"
  local dir="$ROOT/products/$name/apps/web"

  if [ ! -d "$dir" ]; then
    echo -e "  ${YELLOW}SKIP${NC} $name web — directory not found (wrong branch?)"
    return
  fi

  if [ ! -d "$dir/node_modules" ]; then
    echo -e "  ${YELLOW}INSTALL${NC} $name web — running npm install..."
    (cd "$dir" && npm install --silent 2>/dev/null) || {
      echo -e "  ${RED}FAIL${NC} $name web — npm install failed"
      return
    }
  fi

  if is_port_in_use "$port"; then
    echo -e "  ${CYAN}RUNNING${NC} $name web — already on :$port"
    return
  fi

  local log="$LOG_DIR/${name}-web.log"

  # Use npm run dev for all frameworks — it respects each product's own config
  (cd "$dir" && NEXT_TELEMETRY_DISABLED=1 npm run dev > "$log" 2>&1 &)

  echo -e "  ${GREEN}START${NC} $name web → http://localhost:$port  (log: $log)"
}

start_api() {
  local name="$1" port="$2"
  local dir="$ROOT/products/$name/apps/api"

  if [ ! -d "$dir" ]; then
    echo -e "  ${YELLOW}SKIP${NC} $name api — directory not found"
    return
  fi

  if [ ! -d "$dir/node_modules" ]; then
    echo -e "  ${YELLOW}INSTALL${NC} $name api — running npm install..."
    (cd "$dir" && npm install --silent 2>/dev/null) || {
      echo -e "  ${RED}FAIL${NC} $name api — npm install failed"
      return
    }
  fi

  if is_port_in_use "$port"; then
    echo -e "  ${CYAN}RUNNING${NC} $name api — already on :$port"
    return
  fi

  local log="$LOG_DIR/${name}-api.log"
  (cd "$dir" && npm run dev > "$log" 2>&1 &)

  echo -e "  ${GREEN}START${NC} $name api → http://localhost:$port  (log: $log)"
}

echo ""
echo -e "${CYAN}ConnectSW — Starting Products${NC}"
echo -e "Logs → $LOG_DIR/"
echo ""

started_web=0
started_api=0

for product in "${PRODUCTS[@]}"; do
  IFS='|' read -r name web_port api_port framework <<< "$product"

  if ! should_start "$name"; then
    continue
  fi

  echo -e "${CYAN}[$name]${NC}"

  if [ "$API_ONLY" = false ] && [ "$framework" != "none" ]; then
    start_web "$name" "$web_port" "$framework"
    ((started_web++)) || true
  fi

  if [ "$WEB_ONLY" = false ] && [ "$api_port" != "none" ]; then
    start_api "$name" "$api_port"
    ((started_api++)) || true
  fi
done

echo ""
echo -e "${GREEN}Done.${NC} Started $started_web web + $started_api API servers."
echo -e "Stop all: ${YELLOW}./stop-all.sh${NC}"
echo -e "View logs: ${YELLOW}tail -f $LOG_DIR/<product>-web.log${NC}"
echo ""

# Print port summary
echo -e "${CYAN}Port Summary:${NC}"
echo "  Web:"
for product in "${PRODUCTS[@]}"; do
  IFS='|' read -r name web_port api_port framework <<< "$product"
  if ! should_start "$name"; then continue; fi
  if [ "$API_ONLY" = true ]; then continue; fi
  if [ "$framework" = "none" ]; then continue; fi
  if [ -d "$ROOT/products/$name/apps/web" ]; then
    local_status=""
    if is_port_in_use "$web_port"; then
      local_status="${GREEN}●${NC}"
    else
      local_status="${RED}○${NC}"
    fi
    printf "    %b %-30s :%-5s\n" "$local_status" "$name" "$web_port"
  fi
done

if [ "$WEB_ONLY" = false ]; then
  echo "  API:"
  for product in "${PRODUCTS[@]}"; do
    IFS='|' read -r name web_port api_port framework <<< "$product"
    if ! should_start "$name"; then continue; fi
    if [ "$api_port" = "none" ]; then continue; fi
    if [ -d "$ROOT/products/$name/apps/api" ]; then
      local_status=""
      if is_port_in_use "$api_port"; then
        local_status="${GREEN}●${NC}"
      else
        local_status="${RED}○${NC}"
      fi
      printf "    %b %-30s :%-5s\n" "$local_status" "$name" "$api_port"
    fi
  done
fi
echo ""
