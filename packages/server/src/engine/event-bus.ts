import { EventBus, MessageEnvelope } from '@ai-pentest/contracts';

type Handler = (message: MessageEnvelope) => void;

export class InternalEventBus implements EventBus {
  private handlers: Map<string, Set<Handler>> = new Map();

  async publish(message: MessageEnvelope): Promise<void> {
    const topicHandlers = this.handlers.get(message.topic);
    if (topicHandlers) {
      topicHandlers.forEach(handler => {
        // Run handlers asynchronously to avoid blocking the publisher
        setTimeout(() => handler(message), 0);
      });
    }
  }

  subscribe(topic: string, handler: Handler): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);
  }

  unsubscribe(topic: string, handler: Handler): void {
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      topicHandlers.delete(handler);
    }
  }
}
