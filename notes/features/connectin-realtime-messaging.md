# ConnectIn: Real-Time Messaging via WebSocket

## Branch: feat/connectin/realtime-messaging

## Architecture

### Protocol
- WebSocket at `ws://localhost:5007/ws`
- JWT token passed as query param: `?token=<accessToken>`
- JSON messages with `{ type, payload }` envelope

### Message Types (Server → Client)
- `message:new` — new message in a conversation
- `message:read` — message marked as read
- `typing:start` / `typing:stop` — typing indicators
- `presence:online` / `presence:offline` — online status
- `error` — error notification

### Message Types (Client → Server)
- `typing:start` — user started typing
- `typing:stop` — user stopped typing
- `ping` — keepalive

### Backend Components
1. `@fastify/websocket` plugin registration
2. `plugins/websocket.ts` — WS plugin with JWT auth, connection management
3. `ws/connection-manager.ts` — tracks userId → ws connections, broadcasts
4. Update `messaging.routes.ts` — broadcast on sendMessage/markRead

### Frontend Components
1. `useWebSocket.ts` — manages WS connection lifecycle
2. Update `useMessages.ts` — receive live messages, remove polling
3. `TypingIndicator.tsx` — "user is typing..." display
4. Online presence dots on ConversationItem avatars

### Online Presence
- In-memory Set (no Redis needed for MVP)
- Track connected userIds
- Broadcast presence changes to conversation partners

## TDD Order
1. Backend: WS connection with JWT auth tests
2. Backend: Message broadcast tests
3. Backend: Typing indicator tests
4. Frontend: useWebSocket hook
5. Frontend: Update useMessages integration
6. Frontend: TypingIndicator component
7. Frontend: Online presence dots
