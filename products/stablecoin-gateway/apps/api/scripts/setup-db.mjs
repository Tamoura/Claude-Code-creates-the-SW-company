#!/usr/bin/env node

import { execSync } from 'child_process';
import pg from 'pg';
const { Client } = pg;

async function setupDatabase() {
  console.log('Setting up stablecoin_gateway_dev database...');

  // Parse DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stablecoin_gateway_dev?schema=public';
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

  if (!match) {
    console.error('Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port, database] = match;

  // Connect to postgres database to create our database
  const client = new Client({
    user,
    password,
    host,
    port: parseInt(port),
    database: 'postgres',
  });

  try {
    await client.connect();

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [database]
    );

    if (result.rows.length === 0) {
      await client.query(`CREATE DATABASE ${database}`);
      console.log(`✅ Database ${database} created`);
    } else {
      console.log(`✅ Database ${database} already exists`);
    }

    await client.end();

    // Push schema using Prisma
    console.log('Pushing schema to database...');
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });

    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  }
}

setupDatabase();
