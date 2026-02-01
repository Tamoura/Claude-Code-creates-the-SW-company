# Stablecoin Gateway - E2E and Integration Tests

This directory contains end-to-end and integration tests for the Stablecoin Gateway product.

## Overview

The integration tests verify the complete system working together:
- Backend API (port 5001)
- Frontend web app (port 3104)
- PostgreSQL database
- Redis (for rate limiting and queues)

## Test Coverage

The `integration/full-stack.test.ts` file includes comprehensive tests for:

1. **Backend Health Check** - Verifies API is running
2. **User Authentication Flow** - Signup, login, token generation
3. **Payment Sessions** - Creating payment sessions with authentication
4. **API Key CRUD** - Complete lifecycle: create, list, delete
5. **Webhook CRUD** - Complete lifecycle: create, list, update, delete
6. **Frontend Accessibility** - Verifies web app is serving correctly
7. **Authentication Edge Cases** - Invalid tokens, missing auth, etc.

## Prerequisites

Before running integration tests, ensure the following services are running:

```bash
# 1. Start PostgreSQL (via Docker or local install)
docker-compose up -d postgres redis

# 2. Start the backend API (from apps/api directory)
cd apps/api
npm run dev
# API should be running on http://localhost:5001

# 3. Start the frontend web app (from apps/web directory)
cd apps/web
npm run dev
# Web app should be running on http://localhost:3104
```

Verify services are running:
```bash
# Check API health
curl http://localhost:5001/health

# Check frontend
curl http://localhost:3104
```

## Installation

Install dependencies:

```bash
cd e2e
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests with verbose output
```bash
npm run test:verbose
```

### Run specific test suites
```bash
# Run only authentication tests
npm test -- --testNamePattern="User Authentication Flow"

# Run only API key tests
npm test -- --testNamePattern="API Key CRUD"

# Run only webhook tests
npm test -- --testNamePattern="Webhook CRUD"
```

## Test Structure

```
e2e/
├── integration/
│   ├── full-stack.test.ts    # Main integration test suite
│   └── jest.config.ts         # Jest configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Test Data

Tests use unique email addresses per run to avoid conflicts:
- Email format: `test-{timestamp}@example.com`
- Password: `SecurePassword123!@#`

Each test run creates fresh data and cleans up after itself.

## Common Issues

### Connection refused errors

**Problem**: Tests fail with `ECONNREFUSED` errors.

**Solution**: Ensure both API and frontend are running:
```bash
# Check if services are running
lsof -i :5001  # API
lsof -i :3104  # Frontend

# Start services if needed
cd apps/api && npm run dev &
cd apps/web && npm run dev &
```

### Database connection errors

**Problem**: Tests fail with database connection errors.

**Solution**: Ensure PostgreSQL is running and accessible:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start if needed
docker-compose up -d postgres
```

### Tests timeout

**Problem**: Tests exceed the 30-second timeout.

**Solution**:
1. Check if services are running slowly
2. Increase timeout in `jest.config.ts` if needed
3. Check for network issues

### Authentication failures

**Problem**: 401 Unauthorized errors in tests.

**Solution**:
1. Verify JWT_SECRET is set in API environment
2. Check token generation in login endpoint
3. Verify Authorization header format

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start services
  run: docker-compose up -d

- name: Run integration tests
  run: |
    cd e2e
    npm install
    npm test
```

## Contributing

When adding new integration tests:

1. Follow the existing test structure (describe/it blocks)
2. Use descriptive test names
3. Clean up test data after tests
4. Add comments explaining complex test scenarios
5. Ensure tests are idempotent (can run multiple times)
6. Use unique identifiers (timestamps) for test data

## Test Philosophy

- **No mocks**: Integration tests use real services
- **Isolated**: Each test is independent and can run in any order
- **Comprehensive**: Tests cover happy paths and error cases
- **Fast**: Tests complete in under 30 seconds total
- **Reliable**: Tests use proper waits and assertions

## Support

For issues or questions:
1. Check the Common Issues section above
2. Review test logs for specific error messages
3. Verify all prerequisites are met
4. Contact the DevOps team for CI/CD issues
