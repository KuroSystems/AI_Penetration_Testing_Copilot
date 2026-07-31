import { EventBus, MessageEnvelope } from '@ai-pentest/contracts';

export interface TelemetryMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  engineLatencies: Record<string, number[]>; // Array of latencies in ms
  ruleTriggers: Record<string, number>;
  confidenceHistory: { sessionId: string; score: number; timestamp: Date }[];
  requestCount: number;
}

export class TelemetryEngine {
  private metrics: TelemetryMetrics = {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    engineLatencies: {},
    ruleTriggers: {},
    confidenceHistory: [],
    requestCount: 0
  };

  constructor(eventBus: EventBus) {
    this.setupSubscriptions(eventBus);
  }

  private setupSubscriptions(eventBus: EventBus) {
    eventBus.subscribe('telemetry.latency', (msg) => {
      const { engine, latency } = msg.payload;
      if (!this.metrics.engineLatencies[engine]) {
        this.metrics.engineLatencies[engine] = [];
      }
      this.metrics.engineLatencies[engine].push(latency);
    });

    eventBus.subscribe('telemetry.usage', (msg) => {
      const { promptTokens, completionTokens } = msg.payload;
      this.metrics.promptTokens += promptTokens || 0;
      this.metrics.completionTokens += completionTokens || 0;
      this.metrics.totalTokens += (promptTokens || 0) + (completionTokens || 0);
      this.metrics.requestCount += 1;
    });

    eventBus.subscribe('telemetry.rule_trigger', (msg) => {
      const { ruleId } = msg.payload;
      this.metrics.ruleTriggers[ruleId] = (this.metrics.ruleTriggers[ruleId] || 0) + 1;
    });

    eventBus.subscribe('telemetry.confidence', (msg) => {
      const { sessionId, score } = msg.payload;
      this.metrics.confidenceHistory.push({
        sessionId,
        score,
        timestamp: msg.timestamp
      });
      // Keep only last 100 entries
      if (this.metrics.confidenceHistory.length > 100) {
        this.metrics.confidenceHistory.shift();
      }
    });
  }

  public getMetrics(): any {
    // Calculate averages for latencies
    const avgLatencies: Record<string, number> = {};
    for (const [engine, times] of Object.entries(this.metrics.engineLatencies)) {
      const sum = times.reduce((a, b) => a + b, 0);
      avgLatencies[engine] = sum / times.length;
    }

    return {
      ...this.metrics,
      averageLatencies: avgLatencies
    };
  }
}
