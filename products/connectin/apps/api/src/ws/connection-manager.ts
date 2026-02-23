import type { WebSocket } from 'ws';

export interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Manages WebSocket connections per user.
 * A user may have multiple connections (e.g. multiple tabs).
 */
class ConnectionManager {
  private connections = new Map<string, Set<WebSocket>>();

  add(userId: string, ws: WebSocket): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(ws);
  }

  remove(userId: string, ws: WebSocket): void {
    const set = this.connections.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  isOnline(userId: string): boolean {
    return this.connections.has(userId);
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /** Send a message to all connections for a specific user */
  sendToUser(userId: string, message: WsMessage): void {
    const set = this.connections.get(userId);
    if (!set) return;
    const data = JSON.stringify(message);
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }

  /** Send to all members of a conversation except the sender */
  broadcastToConversation(
    memberIds: string[],
    senderId: string,
    message: WsMessage
  ): void {
    for (const id of memberIds) {
      if (id !== senderId) {
        this.sendToUser(id, message);
      }
    }
  }

  get connectionCount(): number {
    let count = 0;
    for (const set of this.connections.values()) {
      count += set.size;
    }
    return count;
  }
}

// Singleton
export const connectionManager = new ConnectionManager();
