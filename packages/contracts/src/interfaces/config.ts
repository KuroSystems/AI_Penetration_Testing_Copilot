import { SyncSettings } from './sync';

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
  multiAgentMode: boolean;
}

export interface AppConfig {
  model: ModelSettings;
  safety: SafetySettings;
  orchestration: OrchestrationSettings;
  sync: SyncSettings; // Added for Phase 23
  ollamaUrl: string;
  useMock: boolean;
}
