export interface ModelConfig {
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  apiKey?: string;
  baseUrl?: string;
}

export interface ModelResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  raw?: any; // Original response from the provider
}

export interface ModelProvider {
  id: string;
  generateText(prompt: string, config?: Partial<ModelConfig>): Promise<ModelResponse>;
  streamText?(prompt: string, config?: Partial<ModelConfig>): AsyncIterable<string>;
  listModels?(): Promise<string[]>;
  pullModel?(modelName: string): Promise<void>;
  getEmbeddings?(text: string, model?: string): Promise<number[]>;
}
