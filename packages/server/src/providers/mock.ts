import { ModelProvider, ModelConfig, ModelResponse } from '@ai-pentest/contracts';

export class MockModelProvider implements ModelProvider {
  public id = 'mock-provider';

  async listModels(): Promise<string[]> {
    return ['mock-llama3', 'mock-mistral'];
  }

  async generateText(prompt: string, config?: Partial<ModelConfig>): Promise<ModelResponse> {
    return {
      text: `Mock response to: "${prompt}" using ${config?.modelName || 'default-model'}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      raw: { mock: true }
    };
  }

  async *streamText(prompt: string, config?: Partial<ModelConfig>): AsyncIterable<string> {
    const response = `Mock streaming response to: "${prompt}"`;
    const words = response.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}
