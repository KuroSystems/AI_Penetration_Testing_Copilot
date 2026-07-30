import { ModelProvider, Session } from '@ai-pentest/contracts';

export class ClarificationEngine {
  private modelProvider: ModelProvider;

  constructor(modelProvider: ModelProvider) {
    this.modelProvider = modelProvider;
  }

  async generateQuestions(session: Session, reasoningRationale: string): Promise<string> {
    const prompt = `
      You are the AI Pentest Copilot. Your confidence in the next action is low.
      
      Current Pentest State:
      - Target: ${session.target}
      - Phase: ${session.state.currentPhase}
      - Known Facts: ${session.state.knownFacts.join(', ') || 'None'}
      - Rationale for uncertainty: ${reasoningRationale}
      
      Task:
      Generate a clear, technical, and targeted set of questions for the user (the pentester) 
      to provide the missing information needed to proceed confidently. 
      Keep it professional and concise.
      
      Questions:
    `;

    try {
      const response = await this.modelProvider.generateText(prompt, { temperature: 0.7 });
      return response.text;
    } catch (error) {
      console.error('Failed to generate clarification questions:', error);
      return "I need more information about the target environment before I can recommend a specific next step. Could you provide details on discovered services or previous scan results?";
    }
  }
}
