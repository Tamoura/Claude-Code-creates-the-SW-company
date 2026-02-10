# Pulse WebSocket Protocol

Pulse uses WebSocket for real-time activity streaming. The implementation is built on `@fastify/websocket` (which wraps the `ws` library) with room-based pub/sub backed by Redis.

## Connection

**Endpoint**: `ws://localhost:5003/api/v1/activity/stream`
**Production**: `wss://api.pulse.dev/api/v1/activity/stream`

All messages are JSON-encoded strings.

## Authentication

WebSocket connections must be authenticated before any room subscriptions are allowed. There are two authentication methods:

### Method 1: Query Parameter (Recommended)

Pass the JWT token as a query parameter during the handshake:

```
ws://localhost:5003/api/v1/activity/stream?token=eyJhbGciOiJIUzI1NiIs...
```

The server validates the token during the upgrade. If the token is valid, the connection is established and an `authenticated` message is sent immediately.

### Method 2: Auth Message

Connect without a token, then send an authentication message within 10 seconds:

```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

If authentication succeeds, the server responds with:

```json
{
  "type": "authenticated",
  "userId": "clx1abc123"
}
```

If authentication fails (invalid or expired token), the server sends an error and closes the connection with code `4001`:

```json
{
  "type": "error",
  "message": "Invalid or expired token"
}
```

If no authentication is received within 10 seconds, the server closes the connection with code `4001` and message `"Authentication timeout"`.

## Room-Based Subscriptions

After authentication, clients subscribe to rooms to receive events. Events are only broadcast to clients that have joined the relevant room.

### Room Types

| Pattern | Description | Example |
|---------|-------------|---------|
| `team:<teamId>` | All activity events for a team | `team:clx1abc123` |
| `repo:<repoId>` | Activity for a specific repository | `repo:clx2def456` |

Room names must match the format `^(team|repo):[a-zA-Z0-9_-]+$`.

### Subscribe

```json
{
  "type": "subscribe",
  "room": "team:clx1abc123"
}
```

**Response**:

```json
{
  "type": "subscribed",
  "room": "team:clx1abc123"
}
```

A single connection can subscribe to multiple rooms. Subscribe to each room with a separate message.

### Unsubscribe

```json
{
  "type": "unsubscribe",
  "room": "team:clx1abc123"
}
```

**Response**:

```json
{
  "type": "unsubscribed",
  "room": "team:clx1abc123"
}
```

When a connection is closed, the client is automatically removed from all rooms.

## Server-to-Client Messages

### Activity Event

Broadcast when a GitHub webhook event is processed (commit, PR, review, or deployment).

```json
{
  "type": "event",
  "room": "team:clx1abc123",
  "event": {
    "type": "commit",
    "repo": "acme/backend-api",
    "author": "jordan-dev",
    "timestamp": "2026-02-07T10:15:00.000Z",
    "summary": "feat(auth): implement JWT refresh token rotation",
    "metadata": {
      "id": "clx3cm001",
      "sha": "abc1234def5678"
    }
  }
}
```

**Event types**:

| Type | Description | Summary format | Metadata |
|------|-------------|----------------|----------|
| `commit` | Code pushed to a branch | Commit message (first line) | `id`, `sha` |
| `pull_request` | PR opened, updated, merged, or closed | `#<number> <title>` | `id`, `number`, `state` |
| `review` | PR review submitted | `<state> review on #<number>` | `id`, `state` |
| `deployment` | Deployment event | `<environment> deployment: <status>` | `id`, `environment`, `status` |

### Sync Progress

Broadcast during repository data ingestion to show sync progress.

```json
{
  "type": "sync_progress",
  "data": {
    "repoId": "clx2def456",
    "repoName": "backend-api",
    "progress": 67,
    "status": "syncing"
  }
}
```

### Anomaly Alert

Broadcast when an anomalous pattern is detected by the anomaly detection job.

```json
{
  "type": "anomaly",
  "room": "team:clx1abc123",
  "data": {
    "id": "alert_xyz789",
    "anomalyType": "stalled_pr",
    "severity": "high",
    "title": "PR #142 has been open 52 hours without review",
    "repoName": "backend-api",
    "timestamp": "2026-02-07T10:30:00.000Z"
  }
}
```

**Anomaly types**:

| Type | Trigger | Severity |
|------|---------|----------|
| `commit_frequency_drop` | >50% fewer commits than same day last week | medium |
| `stalled_pr` | PR open >48 hours without any review activity | high |
| `coverage_drop` | >5% decrease in test coverage in a single commit | high |
| `risk_score_spike` | Risk score increases by >15 points in one calculation | high |
| `review_load_imbalance` | One team member has >3x the review load of another | low |

### Risk Score Update

Broadcast when the sprint risk score is recalculated (every 4 hours during work hours).

```json
{
  "type": "risk_update",
  "room": "team:clx1abc123",
  "data": {
    "score": 72,
    "previousScore": 58,
    "explanation": "Sprint risk is 72 (high). Top factors: PR review backlog (5 PRs waiting >24h), velocity trend (only 33% of expected PRs merged), commit frequency drop (35% below average)."
  }
}
```

### Ping (Heartbeat)

The server sends a ping every 30 seconds to detect stale connections.

```json
{
  "type": "ping"
}
```

### Error

Sent when the server encounters an error processing a client message.

```json
{
  "type": "error",
  "message": "Invalid message format",
  "code": "INVALID_FORMAT"
}
```

## Client-to-Server Messages

### Summary

| Message Type | Description | When to Send |
|-------------|-------------|--------------|
| `auth` | Authenticate with JWT token | Immediately after connection (if not using query param) |
| `subscribe` | Join a room to receive events | After authentication |
| `unsubscribe` | Leave a room | When no longer interested in a room's events |
| `pong` | Heartbeat response | Within 10 seconds of receiving a `ping` |

### Pong (Heartbeat Response)

Clients must respond to `ping` messages with a `pong` within 10 seconds, or the server will close the connection.

```json
{
  "type": "pong"
}
```

## Heartbeat and Connection Management

The heartbeat mechanism ensures stale connections are detected and cleaned up:

1. **Server sends `ping`** every 30 seconds to all connected clients
2. **Client must respond with `pong`** within 10 seconds
3. **No pong received** = server closes the connection and removes the client from all rooms

## Client Reconnection Strategy

When a connection drops, the client should implement exponential backoff reconnection:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate (0ms) |
| 2 | 1 second |
| 3 | 2 seconds |
| 4 | 4 seconds |
| 5 | 8 seconds |
| 6+ | 16 seconds |
| Max | 30 seconds |

### Reconnection Flow

1. Detect connection close or error
2. Show a "Reconnecting..." indicator in the UI
3. Wait the appropriate backoff delay
4. Reconnect with a fresh JWT token (re-authenticate if the token has expired)
5. Re-subscribe to all previously subscribed rooms
6. Request missed events by passing `lastEventId` in the subscribe message:

```json
{
  "type": "subscribe",
  "rooms": ["team:clx1abc123"],
  "lastEventId": "evt_abc122"
}
```

The server replays events after `lastEventId` from the database (up to 100 events within the last 5 minutes).

## Connection Lifecycle

```
Client                              Server
  |                                    |
  |--- WS Connect (with token) ------>|
  |                                    |-- Validate JWT
  |<-- { type: "authenticated" } -----|
  |                                    |
  |--- { type: "subscribe",           |
  |      room: "team:abc" } --------->|
  |                                    |-- Join room
  |<-- { type: "subscribed",          |
  |      room: "team:abc" } ----------|
  |                                    |
  |      ... events flow ...           |
  |                                    |
  |<-- { type: "event",               |
  |      room: "team:abc",            |
  |      event: { ... } } ------------|
  |                                    |
  |<-- { type: "ping" } --------------|  (every 30s)
  |--- { type: "pong" } ------------->|  (within 10s)
  |                                    |
  |--- { type: "unsubscribe",         |
  |      room: "team:abc" } --------->|
  |<-- { type: "unsubscribed",        |
  |      room: "team:abc" } ----------|
  |                                    |
  |--- Close connection -------------->|
  |                                    |-- Remove from all rooms
```

## Error Codes

| Code | Close Code | Description |
|------|-----------|-------------|
| `AUTH_TIMEOUT` | 4001 | No authentication received within 10 seconds |
| `AUTH_FAILED` | 4001 | Invalid or expired JWT token |
| `INVALID_JSON` | 4001 | Message is not valid JSON |
| `INVALID_FORMAT` | -- | Message does not match expected schema (connection stays open) |
| `INVALID_ROOM` | -- | Room name does not match pattern (connection stays open) |
| `ALREADY_AUTHENTICATED` | -- | Client sent `auth` message after already authenticating |

Close code `4001` is an application-level close code indicating an authentication failure. The WebSocket connection is terminated.

Non-fatal errors (no close code) keep the connection open and the client can continue sending messages.

## Redis Pub/Sub Integration

The WebSocket server subscribes to Redis channels to receive events from the webhook handler and background jobs. This architecture supports future horizontal scaling where multiple API server instances can broadcast events to their locally connected clients.

**Redis channels**:

| Channel | Publishers | Events |
|---------|-----------|--------|
| `events:team:<teamId>` | Webhook handler, GitHub sync job | Activity events (commits, PRs, reviews, deployments) |
| `events:repo:<repoId>` | Webhook handler, GitHub sync job | Repository-specific events |
| `alerts:team:<teamId>` | Anomaly detection job | Anomaly alerts |
| `sync:repo:<repoId>` | Ingestion worker | Sync progress updates |

When an event is published to a Redis channel, the WebSocket server's room manager receives it and broadcasts to all clients subscribed to the matching room.
