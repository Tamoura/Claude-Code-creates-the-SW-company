#!/usr/bin/env bash
#
# simulate-payment.sh
#
# Walks a payment session through the full lifecycle:
#   PENDING -> CONFIRMING -> COMPLETED
#
# Uses the stablecoin-gateway REST API. Intended for development
# and demo purposes when no real blockchain is available.
#
# Usage:
#   ./scripts/simulate-payment.sh
#   ./scripts/simulate-payment.sh --api-url http://localhost:5001
#   ./scripts/simulate-payment.sh --email merchant@example.com --password 'SecurePass123!'
#   ./scripts/simulate-payment.sh --token <existing-access-token>
#   ./scripts/simulate-payment.sh --api-key <existing-api-key>
#
# Requirements: curl, jq

set -euo pipefail

# -------------------------------------------------------------------
# Defaults
# -------------------------------------------------------------------
API_URL="${API_URL:-http://localhost:5001}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"
API_KEY="${API_KEY:-}"
AMOUNT="10.00"
MERCHANT_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

# -------------------------------------------------------------------
# Parse arguments
# -------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url)   API_URL="$2";   shift 2 ;;
    --email)     EMAIL="$2";     shift 2 ;;
    --password)  PASSWORD="$2";  shift 2 ;;
    --token)     ACCESS_TOKEN="$2"; shift 2 ;;
    --api-key)   API_KEY="$2";   shift 2 ;;
    --amount)    AMOUNT="$2";    shift 2 ;;
    --merchant)  MERCHANT_ADDRESS="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --api-url URL       API base URL (default: http://localhost:5001)"
      echo "  --email EMAIL       Login email"
      echo "  --password PASS     Login password"
      echo "  --token TOKEN       Existing access token (skips login)"
      echo "  --api-key KEY       Existing API key (skips login and key creation)"
      echo "  --amount AMT        Payment amount in USD (default: 10.00)"
      echo "  --merchant ADDR     Merchant wallet address"
      echo "  -h, --help          Show this help"
      echo ""
      echo "Environment variables:"
      echo "  API_URL             Same as --api-url"
      echo "  EMAIL               Same as --email"
      echo "  PASSWORD            Same as --password"
      echo "  ACCESS_TOKEN        Same as --token"
      echo "  API_KEY             Same as --api-key"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

step() {
  echo ""
  echo -e "${BOLD}${CYAN}==> $1${RESET}"
}

ok() {
  echo -e "${GREEN}    OK${RESET}"
}

fail() {
  echo -e "${RED}    FAILED: $1${RESET}"
  exit 1
}

show_curl() {
  echo -e "${YELLOW}    curl $*${RESET}"
}

show_response() {
  echo "$1" | jq . 2>/dev/null || echo "$1"
}

# -------------------------------------------------------------------
# Dependency check
# -------------------------------------------------------------------
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not installed."
    exit 1
  fi
done

# -------------------------------------------------------------------
# Step 0: Health check
# -------------------------------------------------------------------
step "Step 0: Health check"
show_curl "-s ${API_URL}/health"

HEALTH=$(curl -s "${API_URL}/health" 2>/dev/null) || fail "Cannot reach API at ${API_URL}"
HEALTH_STATUS=$(echo "$HEALTH" | jq -r '.status' 2>/dev/null)

if [[ "$HEALTH_STATUS" != "healthy" ]]; then
  echo "    Warning: API health status is '${HEALTH_STATUS}'"
  show_response "$HEALTH"
else
  ok
fi

# -------------------------------------------------------------------
# Step 1: Authenticate
# -------------------------------------------------------------------
if [[ -n "$API_KEY" ]]; then
  step "Step 1: Using provided API key"
  echo "    API key prefix: ${API_KEY:0:12}..."
  ok
elif [[ -n "$ACCESS_TOKEN" ]]; then
  step "Step 1: Using provided access token"
  echo "    Token prefix: ${ACCESS_TOKEN:0:20}..."

  # Still need an API key for payment operations
  step "Step 1b: Creating API key"
  show_curl "-s -X POST ${API_URL}/v1/api-keys -H 'Authorization: Bearer <token>' -d '{\"name\":\"sim-key\",...}'"

  KEY_RESPONSE=$(curl -s -X POST "${API_URL}/v1/api-keys" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"simulate-payment-key","permissions":{"read":true,"write":true,"refund":false}}')

  API_KEY=$(echo "$KEY_RESPONSE" | jq -r '.key // empty')
  if [[ -z "$API_KEY" ]]; then
    echo "    Response:"
    show_response "$KEY_RESPONSE"
    fail "Could not create API key"
  fi
  echo "    Created API key: ${API_KEY:0:12}..."
  ok
else
  # Need to log in (or sign up)
  if [[ -z "$EMAIL" ]]; then
    # Generate a random test email
    RANDOM_ID=$(date +%s)
    EMAIL="simtest-${RANDOM_ID}@example.com"
    PASSWORD="SimTestPass123!"

    step "Step 1a: Signing up as ${EMAIL}"
    show_curl "-s -X POST ${API_URL}/v1/auth/signup -d '{\"email\":\"${EMAIL}\",...}'"

    SIGNUP_RESPONSE=$(curl -s -X POST "${API_URL}/v1/auth/signup" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

    ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.access_token // empty')

    if [[ -z "$ACCESS_TOKEN" ]]; then
      echo "    Signup response:"
      show_response "$SIGNUP_RESPONSE"
      fail "Signup failed"
    fi
    echo "    Signed up. Token prefix: ${ACCESS_TOKEN:0:20}..."
    ok
  else
    if [[ -z "$PASSWORD" ]]; then
      echo -n "Password for ${EMAIL}: "
      read -rs PASSWORD
      echo ""
    fi

    step "Step 1a: Logging in as ${EMAIL}"
    show_curl "-s -X POST ${API_URL}/v1/auth/login -d '{\"email\":\"${EMAIL}\",...}'"

    LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')

    if [[ -z "$ACCESS_TOKEN" ]]; then
      echo "    Login response:"
      show_response "$LOGIN_RESPONSE"
      fail "Login failed"
    fi
    echo "    Logged in. Token prefix: ${ACCESS_TOKEN:0:20}..."
    ok
  fi

  # Create API key
  step "Step 1b: Creating API key"
  show_curl "-s -X POST ${API_URL}/v1/api-keys -H 'Authorization: Bearer <token>' -d '{\"name\":\"sim-key\",...}'"

  KEY_RESPONSE=$(curl -s -X POST "${API_URL}/v1/api-keys" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"simulate-payment-key","permissions":{"read":true,"write":true,"refund":false}}')

  API_KEY=$(echo "$KEY_RESPONSE" | jq -r '.key // empty')
  if [[ -z "$API_KEY" ]]; then
    echo "    Response:"
    show_response "$KEY_RESPONSE"
    fail "Could not create API key"
  fi
  echo "    Created API key: ${API_KEY:0:12}..."
  ok
fi

# -------------------------------------------------------------------
# Step 2: Create payment session (PENDING)
# -------------------------------------------------------------------
IDEMPOTENCY_KEY="sim-$(date +%s)-$$"

step "Step 2: Create payment session (PENDING)"
show_curl "-s -X POST ${API_URL}/v1/payment-sessions -H 'Authorization: Bearer <api-key>' -H 'Idempotency-Key: ${IDEMPOTENCY_KEY}' -d '{\"amount\":${AMOUNT},...}'"

CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/v1/payment-sessions" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d "{
    \"amount\": ${AMOUNT},
    \"currency\": \"USD\",
    \"network\": \"polygon\",
    \"token\": \"USDC\",
    \"description\": \"Simulated payment via simulate-payment.sh\",
    \"merchant_address\": \"${MERCHANT_ADDRESS}\"
  }")

PAYMENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')
PAYMENT_STATUS=$(echo "$CREATE_RESPONSE" | jq -r '.status // empty')

if [[ -z "$PAYMENT_ID" ]]; then
  echo "    Response:"
  show_response "$CREATE_RESPONSE"
  fail "Could not create payment session"
fi

echo "    Payment ID:  ${PAYMENT_ID}"
echo "    Status:      ${PAYMENT_STATUS}"
echo "    Amount:      \$${AMOUNT} USDC"
show_response "$CREATE_RESPONSE"
ok

# -------------------------------------------------------------------
# Step 3: Advance to CONFIRMING
# -------------------------------------------------------------------
FAKE_TX_HASH="0xsim$(printf '%064x' $RANDOM$RANDOM$RANDOM)"
FAKE_CUSTOMER="0x$(printf '%040x' $RANDOM$RANDOM$RANDOM)"

step "Step 3: Update payment to CONFIRMING"
echo "    Simulated tx_hash:          ${FAKE_TX_HASH:0:20}..."
echo "    Simulated customer_address: ${FAKE_CUSTOMER:0:20}..."
show_curl "-s -X PATCH ${API_URL}/v1/payment-sessions/${PAYMENT_ID} -d '{\"status\":\"CONFIRMING\",\"tx_hash\":\"...\"}'"

CONFIRM_RESPONSE=$(curl -s -X PATCH "${API_URL}/v1/payment-sessions/${PAYMENT_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"CONFIRMING\",
    \"tx_hash\": \"${FAKE_TX_HASH}\",
    \"customer_address\": \"${FAKE_CUSTOMER}\"
  }")

CONFIRM_STATUS=$(echo "$CONFIRM_RESPONSE" | jq -r '.status // empty')

echo "    Response status: ${CONFIRM_STATUS}"
show_response "$CONFIRM_RESPONSE"

if [[ "$CONFIRM_STATUS" == "confirming" || "$CONFIRM_STATUS" == "CONFIRMING" ]]; then
  ok
else
  echo ""
  echo -e "${YELLOW}    Note: The API may enforce blockchain verification on status"
  echo -e "    transitions. If this failed, the blockchain monitor service"
  echo -e "    could not verify the simulated tx_hash on a real chain."
  echo -e "    This is expected when no blockchain is connected."
  echo -e ""
  echo -e "    To bypass this, use Option A (Polygon Amoy) or Option B"
  echo -e "    (Hardhat local node) from the testnet setup guide.${RESET}"
fi

# -------------------------------------------------------------------
# Step 4: Advance to COMPLETED
# -------------------------------------------------------------------
step "Step 4: Update payment to COMPLETED"
show_curl "-s -X PATCH ${API_URL}/v1/payment-sessions/${PAYMENT_ID} -d '{\"status\":\"COMPLETED\",\"tx_hash\":\"...\"}'"

COMPLETE_RESPONSE=$(curl -s -X PATCH "${API_URL}/v1/payment-sessions/${PAYMENT_ID}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"COMPLETED\",
    \"tx_hash\": \"${FAKE_TX_HASH}\"
  }")

COMPLETE_STATUS=$(echo "$COMPLETE_RESPONSE" | jq -r '.status // empty')

echo "    Response status: ${COMPLETE_STATUS}"
show_response "$COMPLETE_RESPONSE"

if [[ "$COMPLETE_STATUS" == "completed" || "$COMPLETE_STATUS" == "COMPLETED" ]]; then
  ok
else
  echo ""
  echo -e "${YELLOW}    Note: Same as above -- blockchain verification may have"
  echo -e "    rejected the simulated transaction hash.${RESET}"
fi

# -------------------------------------------------------------------
# Step 5: Verify final state
# -------------------------------------------------------------------
step "Step 5: Verify final payment state"
show_curl "-s ${API_URL}/v1/payment-sessions/${PAYMENT_ID} -H 'Authorization: Bearer <api-key>'"

FINAL_RESPONSE=$(curl -s "${API_URL}/v1/payment-sessions/${PAYMENT_ID}" \
  -H "Authorization: Bearer ${API_KEY}")

FINAL_STATUS=$(echo "$FINAL_RESPONSE" | jq -r '.status // empty')

echo "    Final status: ${FINAL_STATUS}"
show_response "$FINAL_RESPONSE"
ok

# -------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------
step "Summary"
echo "    API URL:       ${API_URL}"
echo "    Payment ID:    ${PAYMENT_ID}"
echo "    Amount:        \$${AMOUNT} USDC"
echo "    Final Status:  ${FINAL_STATUS}"
echo "    Merchant:      ${MERCHANT_ADDRESS}"
echo ""
echo -e "${BOLD}Payment lifecycle:"
echo -e "    PENDING -> CONFIRMING -> ${FINAL_STATUS}${RESET}"
echo ""

if [[ "$FINAL_STATUS" == "completed" || "$FINAL_STATUS" == "COMPLETED" ]]; then
  echo -e "${GREEN}    Simulation completed successfully.${RESET}"
else
  echo -e "${YELLOW}    Simulation finished. Final status is '${FINAL_STATUS}'."
  echo -e "    If status transitions were blocked by blockchain verification,"
  echo -e "    connect a real testnet (Amoy) or local node (Hardhat).${RESET}"
  echo -e "    See: docs/guides/blockchain-testnet-setup.md"
fi

echo ""
