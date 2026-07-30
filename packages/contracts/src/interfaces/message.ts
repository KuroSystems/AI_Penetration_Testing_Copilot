export enum MessageType {
  EVENT = 'event',
  COMMAND = 'command',
  RESPONSE = 'response'
}

export interface MessageEnvelope<T = any> {
  id: string;
  type: MessageType;
  source: string; // The engine/component sending the message
  target?: string; // Optional target for commands/responses
  topic: string; // For pub/sub
  payload: T;
  timestamp: Date;
  correlationId?: string; // To track request/response or related events
  priority?: 'low' | 'normal' | 'high';
  ttl?: number;
  metadata?: Record<string, any>;
}

export interface EventBus {
  publish(message: MessageEnvelope): Promise<void>;
  subscribe(topic: string, handler: (message: MessageEnvelope) => void): void;
  unsubscribe(topic: string, handler: (message: MessageEnvelope) => void): void;
}
