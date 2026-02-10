# ADR-001: WebSocket Library Choice

## Status
Accepted

## Date
2026-02-07

## Context

Pulse requires real-time activity feeds that update within 10 seconds of a GitHub event (NFR-03). We need a transport mechanism for pushing events from the server to connected web and mobile clients. The three main options for real-time browser communication are WebSockets, Server-Sent Events (SSE), and a full-featured socket library like Socket.io.

**Requirements**:
- Bidirectional communication (clients subscribe to rooms, send heartbeats)
- Room-based message routing (per-team, per-repo channels)
- JWT authentication on connection
- Support 500+ concurrent connections per server instance (NFR-05)
- Auto-reconnection with missed event backfill
- Compatible with React Native mobile app
- Must work with Fastify 4.x

**Evaluation Criteria**:
1. Fastify integration quality
2. Bundle size impact on frontend
3. Room-based routing support
4. Memory footprint per connection
5. React Native compatibility
6. ConnectSW pattern alignment

## Alternatives Considered

### Option A: `@fastify/websocket` (native WebSocket via `ws`)
- **Pros**: First-party Fastify plugin, uses the `ws` library (battle-tested), minimal overhead (~200 bytes per connection), no client SDK needed (native WebSocket API), zero additional frontend bundle size, full control over protocol design, Fastify route integration.
- **Cons**: No built-in room abstraction (must implement ourselves), no built-in reconnection (client handles it), no built-in heartbeat (must implement), more code to write for room management.

### Option B: Socket.io
- **Pros**: Built-in rooms, namespaces, auto-reconnection, heartbeat, fallback to long-polling, large community, well-documented.
- **Cons**: Adds ~50KB to frontend bundle (gzipped), requires Socket.io client SDK (not native WebSocket), Fastify integration is unofficial (`fastify-socket.io` is community-maintained, less reliable), adds abstraction layer that hides protocol details, incompatible with standard WebSocket clients, overkill for our use case.

### Option C: Server-Sent Events (SSE)
- **Pros**: Simplest server implementation, built-in browser reconnection, works over standard HTTP, no WebSocket upgrade needed, good for one-way streaming.
- **Cons**: Unidirectional only (server to client), no client-to-server messages without separate REST calls, no native room support, 6-connection limit per domain in HTTP/1.1, requires workaround for auth (query params or cookies), less suitable for mobile.

## Decision

We choose **`@fastify/websocket`** (Option A).

## Rationale

1. **Fastify-native**: `@fastify/websocket` is maintained by the Fastify team. It integrates directly with Fastify routes, hooks, and decorators. No compatibility risk.

2. **Minimal overhead**: The `ws` library is one of the most efficient WebSocket implementations for Node.js. At ~200 bytes per connection, supporting 500+ concurrent connections is straightforward.

3. **Zero frontend bundle impact**: Native WebSocket API is built into all modern browsers and React Native. No client SDK needed. Socket.io would add ~50KB.

4. **Full control**: We need a specific room-based protocol with JWT auth, heartbeat, and event backfill. Building this on raw WebSocket gives us complete control and makes the protocol well-documented and debuggable. Socket.io's abstraction would hide implementation details we need to understand and control.

5. **ConnectSW alignment**: The stablecoin-gateway product uses SSE for real-time updates, which works for its simpler one-way stream. Pulse needs bidirectional communication (subscribe/unsubscribe messages), making WebSocket the better fit. We build the room management layer ourselves (estimated ~150 lines of code).

6. **Room management is simple**: Our room structure is straightforward (team, repo, user channels). A `Map<roomId, Set<WebSocket>>` with Redis pub/sub for cross-process communication is sufficient. This is not complex enough to justify Socket.io's overhead.

## Consequences

### Positive
- Minimal dependencies and bundle size
- Direct Fastify integration with full plugin ecosystem access
- Protocol is self-documenting (JSON messages with `type` field)
- Easy to test with standard WebSocket test clients

### Negative
- Must implement room management (~150 lines)
- Must implement heartbeat/ping-pong (~50 lines)
- Must implement client-side reconnection with exponential backoff (~80 lines)
- Must implement event backfill on reconnect (~40 lines)

### Risks
- If we need to scale beyond a single server, we need Redis pub/sub for cross-instance broadcasting (already planned in architecture)
- If WebSocket connections are blocked by corporate firewalls, we have no automatic fallback to polling (mitigated: WebSocket support is >99% in target browsers)

## Implementation Notes

- Server: `@fastify/websocket` v10.x with `ws` v8.x
- Client (web): Native `WebSocket` API with custom reconnection wrapper
- Client (mobile): React Native `WebSocket` API (same protocol)
- Room manager: In-memory `Map<string, Set<WebSocket>>` + Redis pub/sub
- Heartbeat: Server sends ping every 30s, expects pong within 10s
- Auth: JWT in query parameter `?token=<JWT>`, validated before upgrade
