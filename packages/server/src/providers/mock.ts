import { ModelProvider, ModelConfig, ModelResponse } from '@ai-pentest/contracts';

export class MockModelProvider implements ModelProvider {
  public id = 'mock-provider';

  async listModels(): Promise<string[]> {
    return ['mock-llama3', 'mock-mistral'];
  }

  async generateText(prompt: string, config?: Partial<ModelConfig>): Promise<ModelResponse> {
    if (prompt.includes('Reasoning Engine')) {
      let targetPhase = 'recon';
      let recommendedAction = 'Run nmap scan';
      
      if (prompt.includes('exploit')) {
          recommendedAction = 'Attempt to exploit the service';
      }
      if (prompt.includes('192.168.1.100')) {
          recommendedAction = 'Scan 192.168.1.100';
      }
      if (prompt.includes('port discovery scan')) {
          recommendedAction = 'Perform a port discovery scan';
      }
      if (prompt.includes('directory discovery')) {
          recommendedAction = 'Perform directory discovery';
      }
<<<<<<< Updated upstream
=======
      if (prompt.includes('Burp Suite Repeater')) {
          recommendedAction = 'Use Burp Suite Repeater';
          targetPhase = 'analysis';
      }
>>>>>>> Stashed changes
      
      return {
        text: JSON.stringify({
          currentPhase: targetPhase,
          missingInfo: [],
          recommendedAction: recommendedAction,
          rationale: `Simulated reasoning for ${recommendedAction}`,
          confidence: 0.9,
          needsClarification: false
        }),
        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
        raw: { mock: true }
      };
    }
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
