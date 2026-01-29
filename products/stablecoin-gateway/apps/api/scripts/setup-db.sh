#!/bin/bash

# Setup database for stablecoin-gateway
set -e

echo "Setting up stablecoin_gateway_dev database..."

# Create database if it doesn't exist
psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = 'stablecoin_gateway_dev'" | grep -q 1 || \
  psql -U postgres -h localhost -c "CREATE DATABASE stablecoin_gateway_dev;"

echo "Database created or already exists"

# Push schema to database
npx prisma db push --accept-data-loss --skip-generate --schema=./prisma/schema.prisma

echo "Schema pushed to database successfully"
echo "✅ Database setup complete!"
