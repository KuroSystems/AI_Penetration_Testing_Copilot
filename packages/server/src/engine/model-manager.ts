import { ModelProvider } from '@ai-pentest/contracts';

export class ModelManager {
  private provider: ModelProvider;

  constructor(provider: ModelProvider) {
    this.provider = provider;
  }

  async getAvailableModels(): Promise<string[]> {
    if (this.provider.listModels) {
      return this.provider.listModels();
    }
    return [];
  }

  async pullModel(modelName: string): Promise<void> {
    if (this.provider.pullModel) {
      return this.provider.pullModel(modelName);
    }
    throw new Error('Pulling models is not supported by current provider');
  }

  setProvider(provider: ModelProvider) {
    this.provider = provider;
  }
}
