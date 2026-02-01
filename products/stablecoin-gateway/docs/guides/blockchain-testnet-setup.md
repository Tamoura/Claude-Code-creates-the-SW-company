# Blockchain Testnet Setup Guide

This guide covers three ways to connect the stablecoin-gateway to a blockchain environment for development and testing. Choose the option that fits your workflow.

| Option | Network | External Dependencies | Best For |
|--------|---------|----------------------|----------|
| A. Polygon Amoy | Public testnet | Faucet tokens, MetaMask | End-to-end testing with real wallets |
| B. Hardhat Local | Local dev chain | None | Fast iteration, CI pipelines |
| C. Simulated Mode | None | None | API integration testing, demos |

---

## Option A: Polygon Amoy Testnet

Polygon Amoy is the official Polygon PoS testnet (replaced Mumbai in 2024). It mirrors mainnet behavior so transactions, confirmations, and gas work the same way.

### Prerequisites

- MetaMask browser extension (or any EVM wallet)
- Node.js 20+
- The stablecoin-gateway API running locally (`npm run dev` in `apps/api`)

### Step 1: Add Amoy to MetaMask

Open MetaMask and add a custom network with these values:

| Field | Value |
|-------|-------|
| Network Name | Polygon Amoy Testnet |
| RPC URL | `https://rpc-amoy.polygon.technology` |
| Chain ID | `80002` |
| Currency Symbol | MATIC |
| Block Explorer | `https://amoy.polygonscan.com` |

Alternatively, visit [chainlist.org](https://chainlist.org/?testnets=true&search=amoy) and click "Add to MetaMask".

### Step 2: Get Testnet Tokens

You need both MATIC (for gas) and test USDC (for payments).

**MATIC faucet:**

- Polygon Faucet: https://faucet.polygon.technology/ (select Amoy, paste your wallet address)
- Alchemy Faucet: https://www.alchemy.com/faucets/polygon-amoy (requires free Alchemy account)

**Test USDC:**

There is no official Circle USDC faucet on Amoy. You have two options:

1. Deploy a mock ERC-20 contract (see Option B for a Hardhat-based approach, then deploy to Amoy instead of localhost).
2. Use a community test token. Check the Polygon Discord for the latest recommended test USDC address.

After obtaining a test USDC contract address, import it as a custom token in MetaMask (Settings > Import Token > paste contract address).

### Step 3: Configure the Gateway

Edit the `.env` file in `products/stablecoin-gateway/apps/api/`:

```bash
# Blockchain configuration for Amoy testnet
BLOCKCHAIN_NETWORK=polygon-amoy
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
CONTRACT_ADDRESS=<your-test-usdc-contract-address>

# If using Alchemy (recommended for reliability):
ALCHEMY_API_KEY=<your-alchemy-api-key>

# Reduce confirmation threshold for faster testing (mainnet uses 64)
POLYGON_CONFIRMATIONS=3
```

Then restart the API:

```bash
cd products/stablecoin-gateway/apps/api
npm run dev
```

### Step 4: Test a Payment Flow

1. **Create a payment session** using curl or the dashboard:

```bash
# Sign up / log in first
TOKEN=$(curl -s -X POST http://localhost:5001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"merchant@example.com","password":"SecurePass123!"}' \
  | jq -r '.access_token')

# Create an API key with write permissions
API_KEY=$(curl -s -X POST http://localhost:5001/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"testnet-key","permissions":{"read":true,"write":true,"refund":false}}' \
  | jq -r '.key')

# Create a payment session
curl -s -X POST http://localhost:5001/v1/payment-sessions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "amount": 1.00,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "description": "Amoy testnet payment",
    "merchant_address": "<your-merchant-wallet-address>"
  }' | jq .
```

2. **Send the USDC transfer** from MetaMask to the `merchant_address` shown in the response.

3. **Update the payment session** with the transaction hash from MetaMask:

```bash
PAYMENT_ID=<id-from-step-1>
TX_HASH=<tx-hash-from-metamask>

curl -s -X PATCH "http://localhost:5001/v1/payment-sessions/$PAYMENT_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"tx_hash\": \"$TX_HASH\",
    \"status\": \"CONFIRMING\"
  }" | jq .
```

4. **Wait for confirmations**, then mark as completed:

```bash
curl -s -X PATCH "http://localhost:5001/v1/payment-sessions/$PAYMENT_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"tx_hash\": \"$TX_HASH\",
    \"status\": \"COMPLETED\"
  }" | jq .
```

---

## Option B: Hardhat Local Node

Run a local Ethereum-compatible blockchain with zero external dependencies. Hardhat gives you funded accounts, instant mining, and full control.

### Prerequisites

- Node.js 20+
- npm or yarn

### Step 1: Install Hardhat

From the stablecoin-gateway product root:

```bash
cd products/stablecoin-gateway
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### Step 2: Initialize Hardhat (if not already done)

```bash
npx hardhat init
```

Select "Create a JavaScript project" when prompted (or TypeScript if you prefer). Accept the default settings.

### Step 3: Deploy a Mock USDC Contract

Create `contracts/MockUSDC.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        // Mint 1,000,000 USDC (6 decimals) to deployer
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Faucet function: anyone can mint tokens for testing
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

Install OpenZeppelin:

```bash
npm install --save-dev @openzeppelin/contracts
```

Create `scripts/deploy-mock-usdc.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();

  const address = await usdc.getAddress();
  console.log("MockUSDC deployed to:", address);
  console.log("");
  console.log("Add this to your .env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Step 4: Start the Local Node and Deploy

Open two terminals.

**Terminal 1 -- Start Hardhat node:**

```bash
cd products/stablecoin-gateway
npx hardhat node
```

This starts a local JSON-RPC server at `http://127.0.0.1:8545` with 20 pre-funded accounts (10,000 ETH each). Note the private keys printed in the terminal; you will use Account #0 as the deployer and merchant.

**Terminal 2 -- Deploy the mock USDC contract:**

```bash
cd products/stablecoin-gateway
npx hardhat run scripts/deploy-mock-usdc.js --network localhost
```

Copy the `CONTRACT_ADDRESS` from the output.

### Step 5: Configure the Gateway

Edit the `.env` file in `products/stablecoin-gateway/apps/api/`:

```bash
# Blockchain configuration for Hardhat local node
BLOCKCHAIN_NETWORK=localhost
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<address-from-step-4>

# Use the first Hardhat account as the hot wallet for refunds
HOT_WALLET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ALLOW_PRIVATE_KEY_FALLBACK=true

# Low confirmation threshold (Hardhat mines instantly)
ETHEREUM_CONFIRMATIONS=1
POLYGON_CONFIRMATIONS=1
```

Restart the API:

```bash
cd products/stablecoin-gateway/apps/api
npm run dev
```

### Step 6: Test a Payment Flow

Hardhat auto-mines blocks, so confirmations happen instantly.

```bash
# Create a payment session (use Hardhat Account #0 as merchant)
MERCHANT_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Follow the same create-session / update flow as Option A,
# using $MERCHANT_ADDRESS and the local RPC URL.
```

To simulate a USDC transfer with Hardhat, you can use the Hardhat console:

```bash
npx hardhat console --network localhost
```

```javascript
const usdc = await ethers.getContractAt("MockUSDC", "<CONTRACT_ADDRESS>");
const [deployer, customer] = await ethers.getSigners();

// Give customer some test USDC
await usdc.faucet(customer.address, 100_000_000); // 100 USDC

// Customer sends 10 USDC to merchant
const merchant = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
await usdc.connect(customer).transfer(merchant, 10_000_000); // 10 USDC
```

Use the transaction hash from the `transfer()` call to update your payment session.

---

## Option C: Simulated Mode (No Blockchain)

Skip blockchain entirely and manually advance payment status through the API. This is the fastest way to test your integration logic, webhooks, and UI.

### Prerequisites

- The stablecoin-gateway API running locally
- curl and jq

### Step 1: Configure the Gateway

No special blockchain configuration is needed. The standard `.env` works. However, the PATCH endpoint enforces blockchain verification for CONFIRMING and COMPLETED transitions in production mode. For pure simulation:

1. Make sure the API is running in development mode (`NODE_ENV=development`).
2. If blockchain verification is enabled, you will need to provide valid blockchain data. For pure API-level simulation without a real chain, you can use the `simulate-payment.sh` script (see below) which walks through the state machine using API calls.

The simulated mode works by:
- Creating a payment session (status: PENDING)
- Updating status to CONFIRMING with a placeholder tx_hash
- Updating status to COMPLETED

**Note:** If blockchain verification is enforced on PATCH, the CONFIRMING and COMPLETED transitions will fail without a real transaction. In that case, use Option A or B for the blockchain layer and this approach for everything above it.

### Step 2: Use the Simulation Script

The `scripts/simulate-payment.sh` script automates the full flow. See the next section or run:

```bash
cd products/stablecoin-gateway
./scripts/simulate-payment.sh
```

### Step 3: Manual Simulation via curl

**Sign up or log in:**

```bash
# Sign up a new user
curl -s -X POST http://localhost:5001/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "simtest@example.com",
    "password": "SimTestPass123!"
  }' | jq .
```

**Create an API key:**

```bash
TOKEN=<access_token-from-above>

API_KEY=$(curl -s -X POST http://localhost:5001/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"sim-key","permissions":{"read":true,"write":true,"refund":false}}' \
  | jq -r '.key')
```

**Create a payment session (PENDING):**

```bash
RESPONSE=$(curl -s -X POST http://localhost:5001/v1/payment-sessions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sim-$(date +%s)" \
  -d '{
    "amount": 25.00,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "description": "Simulated payment",
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }')

echo "$RESPONSE" | jq .
PAYMENT_ID=$(echo "$RESPONSE" | jq -r '.id')
```

**Advance to CONFIRMING:**

```bash
curl -s -X PATCH "http://localhost:5001/v1/payment-sessions/$PAYMENT_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMING",
    "tx_hash": "0xsimulated0000000000000000000000000000000000000000000000000001",
    "customer_address": "0x1234567890abcdef1234567890abcdef12345678"
  }' | jq .
```

**Advance to COMPLETED:**

```bash
curl -s -X PATCH "http://localhost:5001/v1/payment-sessions/$PAYMENT_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "tx_hash": "0xsimulated0000000000000000000000000000000000000000000000000001"
  }' | jq .
```

**Verify the final state:**

```bash
curl -s http://localhost:5001/v1/payment-sessions/$PAYMENT_ID \
  -H "Authorization: Bearer $API_KEY" | jq .
```

---

## Environment Variable Reference

These environment variables control blockchain behavior in the gateway API.

| Variable | Description | Example |
|----------|-------------|---------|
| `BLOCKCHAIN_NETWORK` | Target network identifier | `polygon-amoy`, `localhost`, `polygon`, `ethereum` |
| `BLOCKCHAIN_RPC_URL` | JSON-RPC endpoint URL | `https://rpc-amoy.polygon.technology`, `http://127.0.0.1:8545` |
| `CONTRACT_ADDRESS` | USDC token contract address on the target network | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| `ALCHEMY_API_KEY` | Alchemy API key (primary RPC provider) | `abc123...` |
| `INFURA_PROJECT_ID` | Infura project ID (fallback provider) | `def456...` |
| `QUICKNODE_ENDPOINT` | QuickNode full endpoint URL (tertiary provider) | `https://xxx.quiknode.pro/yyy` |
| `ETHEREUM_CONFIRMATIONS` | Required confirmations on Ethereum (default: 3) | `3` |
| `POLYGON_CONFIRMATIONS` | Required confirmations on Polygon (default: 64) | `64` |
| `HOT_WALLET_PRIVATE_KEY` | Private key for refund wallet (dev only) | `0xac09...` |
| `ALLOW_PRIVATE_KEY_FALLBACK` | Allow plaintext private key (dev only, never in production) | `true` |

---

## Troubleshooting

**"Transaction not found on blockchain"**
- The tx_hash does not exist on the network the gateway is pointed at. Verify `BLOCKCHAIN_RPC_URL` matches the network where you sent the transaction.

**"Insufficient confirmations"**
- The transaction exists but has not reached the required confirmation count. Wait and retry, or reduce `POLYGON_CONFIRMATIONS` / `ETHEREUM_CONFIRMATIONS` for testing.

**"No USDC transfer found in transaction"**
- The transaction does not contain an ERC-20 Transfer event for the expected token contract. Verify `CONTRACT_ADDRESS` matches the token you actually transferred.

**"Amount mismatch"**
- The on-chain transfer amount does not match (or exceed) the payment session amount. USDC uses 6 decimals, so 1.00 USD = 1000000 wei.

**Hardhat node not responding**
- Confirm the Hardhat node is running (`npx hardhat node`). The default RPC URL is `http://127.0.0.1:8545`.

**MetaMask shows 0 balance on Amoy**
- Make sure you selected the Amoy network in MetaMask, and that the faucet transaction has confirmed (check on https://amoy.polygonscan.com).
