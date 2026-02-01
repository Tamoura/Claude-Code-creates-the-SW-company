# Quick Start Guide - Integration Tests

This guide gets you running integration tests in under 5 minutes.

## Step 1: Start Services

Open 3 terminal windows:

**Terminal 1 - Database & Redis:**
```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway
docker-compose up -d postgres redis
```

**Terminal 2 - Backend API:**
```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/apps/api
npm run dev
```

**Terminal 3 - Frontend Web:**
```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/apps/web
npm run dev
```

## Step 2: Verify Services

```bash
# Check API (should return {"status":"healthy"})
curl http://localhost:5001/health

# Check Frontend (should return HTML)
curl http://localhost:3104
```

## Step 3: Install Test Dependencies

```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/e2e
npm install
```

## Step 4: Run Tests

```bash
npm test
```

Expected output:
```
 PASS  integration/full-stack.test.ts
  Stablecoin Gateway - Full Stack Integration Tests
    Backend Health Check
      ✓ should return healthy status from health endpoint
    User Authentication Flow
      ✓ should successfully signup a new user
      ✓ should reject duplicate signup with same email
      ✓ should successfully login and receive token
      ✓ should reject login with incorrect password
      ✓ should reject login with non-existent user
    Payment Session Creation
      ✓ should create payment session when authenticated
      ✓ should reject payment session without authentication
      ✓ should reject payment session with invalid amount
    API Key CRUD Lifecycle
      ✓ should create a new API key
      ✓ should list all API keys for authenticated user
      ✓ should delete an API key
      ✓ should verify API key is deleted
      ✓ should reject API key creation without authentication
    Webhook CRUD Lifecycle
      ✓ should create a new webhook
      ✓ should list all webhooks for authenticated user
      ✓ should update a webhook
      ✓ should partially update a webhook
      ✓ should delete a webhook
      ✓ should verify webhook is deleted
      ✓ should reject webhook creation without authentication
    Frontend Accessibility
      ✓ should serve frontend at port 3104
      ✓ should serve static assets
    Authentication Edge Cases
      ✓ should reject request with invalid token format
      ✓ should reject request with missing token
      ✓ should reject request with malformed authorization header
      ✓ should reject request with expired/invalid JWT token

Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
```

## Troubleshooting

### Tests fail immediately
- Check if services are running: `lsof -i :5001` and `lsof -i :3104`
- Start services if needed (see Step 1)

### Database errors
- Ensure PostgreSQL is running: `docker ps | grep postgres`
- Check database connection in API logs

### Timeout errors
- Services may be starting slowly
- Wait 10-15 seconds after starting services before running tests

## Next Steps

- Run specific tests: `npm test -- --testNamePattern="Authentication"`
- Enable watch mode: `npm run test:watch`
- Generate coverage: `npm run test:coverage`
- Read full documentation: [README.md](./README.md)
