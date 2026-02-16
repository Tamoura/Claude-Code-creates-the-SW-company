# ConnectSW Port Registry

**Purpose**: Centralized port allocation to prevent conflicts when running multiple products simultaneously.

**Last Updated**: 2026-02-14

## Port Allocation Rules

- **Frontend (Web)**: 3100-3199
- **Backend (API)**: 5000-5099
- **Mobile Dev Servers**: 8081-8099
- **Databases**: Use Docker default ports with unique container names

## Registered Ports

### Frontend Applications (3100-3199)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 3100 | quantum-computing-usecases | Active | http://localhost:3100 |
| 3102 | qdb-one | Active | http://localhost:3102 |
| 3104 | stablecoin-gateway | Active | http://localhost:3104 |
| 3108 | muaththir | Active | http://localhost:3108 |
| 3110 | connectgrc | Active | http://localhost:3110 |
| 3111 | taskflow | Active | http://localhost:3111 |
| 3112 | recomengine | Active | http://localhost:3112 |
| 3113 | command-center | Active | http://localhost:3113 |
| 3114 | linkedin-agent | Active | http://localhost:3114 |
| 3115-3199 | *Available* | Free | - |

### Backend APIs (5000-5099)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 5001 | stablecoin-gateway | Active | http://localhost:5001 |
| 5005 | muaththir | Active | http://localhost:5005 |
| 5006 | connectgrc | Active | http://localhost:5006 |
| 5007 | taskflow | Active | http://localhost:5007 |
| 5008 | recomengine | Active | http://localhost:5008 |
| 5009 | command-center | Active | http://localhost:5009 |
| 5010 | linkedin-agent | Active | http://localhost:5010 |
| 5011-5099 | *Available* | Free | - |

### Mobile Development (8081-8099)

| Port | Product | Status | URL |
|------|---------|--------|-----|
| 8081-8099 | *Available* | Free | - |

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
cd products/muaththir/apps/web && npm run dev &                 # :3108
cd products/connectgrc/apps/web && npm run dev &                # :3110
cd products/linkedin-agent/apps/web && npm run dev &            # :3114

# Backend APIs
cd products/stablecoin-gateway/apps/api && npm run dev &        # :5001
cd products/muaththir/apps/api && npm run dev &                 # :5005
cd products/connectgrc/apps/api && npm run dev &                # :5006
cd products/linkedin-agent/apps/api && npm run dev &            # :5010
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
lsof -ti:3104,3108,3110,5001,5005,5006 | xargs kill -9
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
