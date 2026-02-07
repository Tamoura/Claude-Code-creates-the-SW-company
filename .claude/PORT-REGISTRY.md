# ConnectSW Port Registry

**Purpose**: Centralized port allocation to prevent conflicts when running multiple products simultaneously.

**Last Updated**: 2026-02-07

## Port Allocation Rules

- **Frontend (Web)**: 3100-3199
- **Backend (API)**: 5000-5099
- **Mobile Dev Servers**: 8081-8099
- **Databases**: Use Docker default ports with unique container names

## Registered Ports

### Frontend Applications (3100-3199)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 3104 | stablecoin-gateway | Active | http://localhost:3104 |
| 3105 | quantum-computing-usecases | Active | http://localhost:3105 |
| 3106 | pulse | Active | http://localhost:3106 |
| 3108 | muaththir | Active | http://localhost:3108 |
| 3109 | invoiceforge | Active | http://localhost:3109 |
| 3110-3199 | *Available* | Free | - |

### Backend APIs (5000-5099)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 5001 | stablecoin-gateway | Active | http://localhost:5001 |
| 5003 | pulse | Active | http://localhost:5003 |
| 5004 | invoiceforge | Active | http://localhost:5004 |
| 5005 | muaththir | Active | http://localhost:5005 |
| 5007-5099 | *Available* | Free | - |

### Mobile Development (8081-8099)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 8081 | pulse (mobile) | Active | http://localhost:8081 |
| 8082-8099 | *Available* | Free | - |

### Databases

| Port | Product | Container Name | Type |
|------|---------|---------------|------|
| 5432 | Multiple | postgres-connectsw | PostgreSQL |
| 6379 | Multiple | redis-connectsw | Redis |
| 27017 | *Available* | mongo-connectsw | MongoDB |

## Port Assignment Process

### For New Products

When creating a new product, agents must:

1. **Check this registry** for next available port
2. **Assign port** in product configuration
3. **Update this registry** with new assignment
4. **Commit registry** with product code

### For Orchestrator

When initiating new product workflows:

1. Read `PORT-REGISTRY.md`
2. Determine next available port(s)
3. Pass port number(s) to relevant agents via task graph
4. Ensure registry is updated before completing workflow

### For Individual Agents

**Frontend Engineer**:
- Check registry for assigned port
- Configure Vite/Next.js to use that port
- Update README with port number

**Backend Engineer**:
- Check registry for assigned port
- Configure Fastify/Express to use that port
- Update API docs with port number

**Mobile Developer**:
- Check registry for assigned port
- Configure Expo/Metro bundler to use that port
- Update mobile README with port number

**DevOps Engineer**:
- Ensure docker-compose uses correct ports
- Verify no port conflicts in CI/CD
- Update deployment docs with port mappings

## Quick Reference Commands

### Start All Products

```bash
# Frontend apps
cd products/stablecoin-gateway/apps/web && npm run dev &        # :3104
cd products/quantum-computing-usecases/apps/web && npm run dev &# :3105
cd products/invoiceforge/apps/web && npm run dev &              # :3109

# Backend APIs
cd products/stablecoin-gateway/apps/api && npm run dev &        # :5001
cd products/invoiceforge/apps/api && npm run dev &              # :5004
```

### Check Port Availability

```bash
# Check if a port is in use
lsof -i :3104
netstat -an | grep 3104

# Kill process on port
lsof -ti:3104 | xargs kill -9
```

### Stop All Development Servers

```bash
# Kill all node processes (use with caution)
pkill -f "vite"
pkill -f "next dev"
pkill -f "fastify"

# Or kill by port
lsof -ti:3104,3105,3109,5001,5004 | xargs kill -9
```

## Port Conflict Resolution

If you encounter "Port already in use" errors:

1. **Check registry**: Verify the port assignment is correct
2. **Check processes**: Run `lsof -i :<port>` to see what's using it
3. **Stop conflicting process**: Kill the process or change port
4. **Update configuration**: Ensure product uses assigned port

## Notes

- **Never reuse ports** between products
- **Always update registry** when adding/removing products
- **Ports are permanent** - don't change once assigned
- **Document in product README** - include assigned port
- **CI/CD uses different ports** - these are for local development only

---

*This registry is the source of truth for all ConnectSW port assignments.*
*Update this file whenever products are added, removed, or reconfigured.*
