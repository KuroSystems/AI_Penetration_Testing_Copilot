import { Session } from './session';

export interface ContextPackage {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  tokenEstimate: number;
}

export interface CompressionConfig {
  maxTokens: number;
  reserveForResponse: number;
  shortTermHistoryLimit: number; // How many recent messages to keep verbatim
}

export interface CompressionEngine {
  compress(session: Session, config: CompressionConfig): Promise<ContextPackage>;
}
