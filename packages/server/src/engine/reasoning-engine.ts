import Ajv from 'ajv';
import { ModelProvider, ReasoningDecision, Schemas } from '@ai-pentest/contracts';

const ajv = new Ajv();
const validateDecision = ajv.compile(Schemas.Decision);

export class ReasoningEngine {
  private modelProvider: ModelProvider;
  private maxRetries = 3;

  constructor(modelProvider: ModelProvider) {
    this.modelProvider = modelProvider;
  }

  async think(composedPrompt: string): Promise<ReasoningDecision> {
    let lastError = '';
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await this.modelProvider.generateText(composedPrompt, {
          temperature: 0.1, // Low temperature for structure
        });

        const decision = this.parseResponse(response.text);
        
        if (validateDecision(decision)) {
          return decision as unknown as ReasoningDecision;
        } else {
          lastError = JSON.stringify(validateDecision.errors);
          console.warn(`Reasoning validation attempt ${i + 1} failed: ${lastError}`);
        }
      } catch (error: any) {
        lastError = error.message;
        console.error(`Reasoning attempt ${i + 1} error: ${lastError}`);
      }
    }

    throw new Error(`Reasoning Engine failed after ${this.maxRetries} retries. Last error: ${lastError}`);
  }

  private parseResponse(text: string): any {
    // Attempt to find JSON block if model wrap in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr);
  }
}
