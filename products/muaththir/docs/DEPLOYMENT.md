# Mu'aththir Deployment Guide

## Prerequisites

| Tool       | Minimum Version | Purpose                    |
|------------|-----------------|----------------------------|
| Docker     | 24+             | Container runtime          |
| Docker Compose | 2.20+       | Multi-container orchestration |
| Node.js    | 20 LTS          | Local development (optional) |
| PostgreSQL | 15              | Database (via Docker or external) |

## Quick Start with Docker Compose

```bash
# 1. Navigate to the product directory
cd products/muaththir

# 2. Create environment file from template
cp .env.example .env

# 3. Edit .env — at minimum set a strong JWT_SECRET
#    Generate one with: openssl rand -base64 48
vim .env

# 4. Build and start all services
docker compose up -d --build

# 5. Verify everything is running
docker compose ps
```

After startup, the services are available at:

| Service    | URL                        |
|------------|----------------------------|
| Web UI     | http://localhost:3108       |
| API        | http://localhost:5005       |
| API Health | http://localhost:5005/api/health |
| PostgreSQL | localhost:5432              |

## Environment Variables Reference

### Required

| Variable       | Description                                  | Example                              |
|----------------|----------------------------------------------|--------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string                 | `postgresql://postgres:pw@localhost:5432/muaththir` |
| `JWT_SECRET`   | Secret for signing JWTs (min 32 chars)       | Output of `openssl rand -base64 48`  |

### Optional (with defaults)

| Variable                    | Default                    | Description                          |
|-----------------------------|----------------------------|--------------------------------------|
| `NODE_ENV`                  | `production`               | Runtime environment                  |
| `PORT`                      | `5005`                     | API server port                      |
| `JWT_EXPIRES_IN`            | `1h`                       | Access token lifetime                |
| `REFRESH_TOKEN_EXPIRY_DAYS` | `7`                        | Refresh token lifetime in days       |
| `ALLOWED_ORIGINS`           | `http://localhost:3108`    | Comma-separated CORS origins         |
| `NEXT_PUBLIC_API_URL`       | `http://localhost:5005`    | API base URL (baked into web build)  |
| `POSTGRES_USER`             | `postgres`                 | Database user                        |
| `POSTGRES_PASSWORD`         | `changeme`                 | Database password                    |
| `POSTGRES_DB`               | `muaththir`                | Database name                        |

## Database Migrations

Migrations run automatically on container startup via `npx prisma migrate deploy`. To run them manually:

```bash
# Inside the API container
docker compose exec api npx prisma migrate deploy

# Or locally (requires DATABASE_URL in env)
cd apps/api
npx prisma migrate deploy
```

To create a new migration during development:

```bash
cd apps/api
npx prisma migrate dev --name describe_your_change
```

## Production Checklist

Before deploying to production, verify:

- [ ] `JWT_SECRET` is a strong random string (min 32 characters)
- [ ] `POSTGRES_PASSWORD` is changed from the default
- [ ] `NODE_ENV` is set to `production`
- [ ] `ALLOWED_ORIGINS` lists only your production frontend domain(s)
- [ ] `NEXT_PUBLIC_API_URL` points to your production API URL
- [ ] HTTPS is terminated at a reverse proxy (nginx, Caddy, or cloud LB)
- [ ] Database backups are configured (pg_dump or cloud-managed snapshots)
- [ ] Container resource limits are set (CPU and memory)
- [ ] Logs are forwarded to a centralized logging service
- [ ] Rate limiting is reviewed and appropriate for expected traffic

## HTTPS / Reverse Proxy

The containers serve plain HTTP. In production, place a reverse proxy in front:

```nginx
# Example nginx config
server {
    listen 443 ssl;
    server_name muaththir.example.com;

    ssl_certificate     /etc/ssl/certs/muaththir.pem;
    ssl_certificate_key /etc/ssl/private/muaththir.key;

    location / {
        proxy_pass http://127.0.0.1:3108;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Health Checks

### Built-in Health Endpoints

**API health** returns database connectivity status:

```bash
curl http://localhost:5005/api/health
# Response:
# { "status": "ok", "database": "connected", "version": "1.0.0", "timestamp": "..." }
```

**Docker health checks** are built into both containers. Check status:

```bash
docker compose ps
# Look for "(healthy)" in the STATUS column

docker inspect --format='{{.State.Health.Status}}' muaththir-api
docker inspect --format='{{.State.Health.Status}}' muaththir-web
```

### Logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail=100 api
```

## Rollback Procedure

### Rolling back a deployment

```bash
# 1. Stop current containers
docker compose down

# 2. Check out the previous known-good version
git checkout <previous-tag-or-commit>

# 3. Rebuild and restart
docker compose up -d --build
```

### Rolling back a database migration

Prisma does not support automatic down migrations. If a migration must be reversed:

```bash
# 1. Stop the API
docker compose stop api

# 2. Connect to the database
docker compose exec postgres psql -U postgres -d muaththir

# 3. Manually reverse the schema changes
# 4. Remove the migration record from _prisma_migrations table
DELETE FROM _prisma_migrations WHERE migration_name = 'YYYYMMDDHHMMSS_migration_name';

# 5. Restart the API
docker compose start api
```

## Rebuilding Individual Services

```bash
# Rebuild and restart only the API
docker compose up -d --build api

# Rebuild and restart only the web frontend
docker compose up -d --build web

# Force a full rebuild (no cache)
docker compose build --no-cache api
docker compose up -d api
```

## Scaling Considerations

For higher availability:

1. Use a managed PostgreSQL service (e.g., AWS RDS, Render Postgres)
2. Run multiple API container replicas behind a load balancer
3. Serve the Next.js frontend via a CDN or edge platform (Vercel, Cloudflare)
4. Extract the `DATABASE_URL` to point to the managed database instead of the Docker postgres service
