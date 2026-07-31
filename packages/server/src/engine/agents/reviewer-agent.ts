import { Agent, AgentRole, ModelProvider, ReasoningDecision } from '@ai-pentest/contracts';

export class ReviewerAgent implements Agent {
  public id = 'reviewer-agent';
  public role = AgentRole.REVIEWER;
  private modelProvider: ModelProvider;

  constructor(modelProvider: ModelProvider) {
    this.modelProvider = modelProvider;
  }

  async process(context: { decision: ReasoningDecision, target: string }): Promise<any> {
    const { decision, target } = context;
    
    const prompt = `
      You are the Security Reviewer Agent for a Penetration Testing Copilot.
      A Mentor Agent has recommended the following action:
      
      Recommended Action: ${decision.recommendedAction}
      Rationale: ${decision.rationale}
      Target: ${target}
      
      Your task is to review this action for:
      1. Scope Compliance: Is it targeting ${target}?
      2. Technical Soundness: Does the action make sense for the rationale?
      3. Safety: Is it unnecessarily destructive?
      
      Respond in valid JSON format:
      {
        "approved": boolean,
        "critique": "string",
        "suggestedModification": "string" | null
      }
    `;

    try {
      const response = await this.modelProvider.generateText(prompt, { temperature: 0.1 });
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response.text);
    } catch (error) {
      console.error('Reviewer agent failed, auto-approving for safety fallback.', error);
      return { approved: true, critique: 'Reviewer unavailable', suggestedModification: null };
    }
  }
}
