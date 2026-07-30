import axios, { AxiosInstance } from 'axios';
import { ModelProvider, ModelConfig, ModelResponse } from '@ai-pentest/contracts';

export class OllamaProvider implements ModelProvider {
  public id = 'ollama';
  private client: AxiosInstance;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models.map((m: any) => m.name);
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      await this.client.post('/api/pull', { name: modelName });
    } catch (error) {
      this.handleError(error);
    }
  }

  async generateText(prompt: string, config?: Partial<ModelConfig>): Promise<ModelResponse> {
    // ... implementation for non-streaming ...
    // Already implemented
    return this.generateTextInternal(prompt, false, config) as Promise<ModelResponse>;
  }

  async *streamText(prompt: string, config?: Partial<ModelConfig>): AsyncIterable<string> {
    try {
      const response = await this.client.post('/api/generate', {
        model: config?.modelName || 'llama3',
        prompt: prompt,
        stream: true,
        options: {
          temperature: config?.temperature,
          num_predict: config?.maxTokens,
          top_p: config?.topP,
          stop: config?.stopSequences,
        }
      }, { responseType: 'stream' });

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const json = JSON.parse(line);
          if (json.response) {
            yield json.response;
          }
        }
      }
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private async generateTextInternal(prompt: string, stream: boolean, config?: Partial<ModelConfig>): Promise<ModelResponse | AsyncIterable<string>> {
    try {
      const response = await this.client.post('/api/generate', {
        model: config?.modelName || 'llama3',
        prompt: prompt,
        stream: stream,
        options: {
          temperature: config?.temperature,
          num_predict: config?.maxTokens,
          top_p: config?.topP,
          stop: config?.stopSequences,
        }
      });

      return {
        text: response.data.response,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        },
        raw: response.data
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getEmbeddings(text: string, model: string = 'llama3'): Promise<number[]> {
    try {
      const response = await this.client.post('/api/embeddings', {
        model,
        prompt: text
      });
      return response.data.embedding;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('Ollama is offline or unreachable.');
    } else {
      console.error('Ollama API error:', error.message);
    }
  }
}
