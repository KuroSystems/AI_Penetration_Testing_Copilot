export interface ModelSettings {
  modelName: string;
  temperature: number;
  topP: number;
  topK: number;
  contextLength: number;
  streaming: boolean;
  stopSequences: string[];
}

export interface SafetySettings {
  level: 'strict' | 'balanced' | 'permissive';
  confirmDestructive: boolean;
}

export interface OrchestrationSettings {
  checkpointInterval: number;
  summaryThreshold: number;
}

export interface AppConfig {
  model: ModelSettings;
  safety: SafetySettings;
  orchestration: OrchestrationSettings;
  ollamaUrl: string;
  useMock: boolean;
}
