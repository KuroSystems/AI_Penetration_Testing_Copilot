import { WebSocketServer, WebSocket } from 'ws';
import { SyncMessage, EventBus, MessageType } from '@ai-pentest/contracts';
import { SessionStateEngine } from './session-state-engine';

export class SyncEngine {
  private wss: WebSocketServer | null = null;
  private peers: Map<string, WebSocket> = new Map();
  private nodeId: string = Math.random().toString(36).substring(7);
  private sessionEngine: SessionStateEngine;
  private eventBus: EventBus;

  constructor(sessionEngine: SessionStateEngine, eventBus: EventBus) {
    this.sessionEngine = sessionEngine;
    this.eventBus = eventBus;
  }

  public async start(port: number): Promise<void> {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        try {
          const message: SyncMessage = JSON.parse(data.toString());
          if (message.senderId !== this.nodeId) {
            this.handleSyncMessage(message);
          }
        } catch (err) {
          console.error('Failed to parse sync message:', err);
        }
      });
    });

    console.log(`Sync Server listening on port ${port} (Node ID: ${this.nodeId})`);
    
    // Subscribe to local state changes to broadcast them
    this.eventBus.subscribe('session.updated', (msg) => {
        this.broadcast({
            type: 'session_update',
            payload: msg.payload,
            senderId: this.nodeId,
            timestamp: new Date()
        });
    });
  }

  private async handleSyncMessage(message: SyncMessage) {
    console.log(`Received sync message of type ${message.type} from ${message.senderId}`);
    
    if (message.type === 'session_update') {
      const { sessionId, state } = message.payload;
      try {
          // Check if session exists, if so merge/update
          const existing = await this.sessionEngine.getSession(sessionId);
          if (existing) {
              // Basic conflict resolution: newer timestamp or just apply if different
              // For Phase 23, we'll just update the local state
              await this.sessionEngine.updateState(sessionId, state);
          }
      } catch (err) {
          console.error('Failed to apply sync update:', err);
      }
    }
  }

  private broadcast(message: SyncMessage) {
    if (!this.wss) return;
    const data = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public async stop(): Promise<void> {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}
