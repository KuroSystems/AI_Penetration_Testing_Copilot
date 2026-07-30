import { 
  Session, 
  ModelProvider, 
  SessionRepository,
  ChatMessage
} from '@ai-pentest/contracts';
import { SessionStateEngine } from './session-state-engine';

export interface MemoryConfig {
  historyThreshold: number; // Trigger summary after this many messages
}

export class MemoryEngine {
  private modelProvider: ModelProvider;
  private sessionEngine: SessionStateEngine;
  private config: MemoryConfig;

  constructor(
    modelProvider: ModelProvider, 
    sessionEngine: SessionStateEngine,
    config: MemoryConfig = { historyThreshold: 20 }
  ) {
    this.modelProvider = modelProvider;
    this.sessionEngine = sessionEngine;
    this.config = config;
  }

  async refreshLongTermMemory(sessionId: string): Promise<void> {
    const session = await this.sessionEngine.getSession(sessionId);
    if (!session) return;

    const history = session.state.chatHistory;
    if (history.length < this.config.historyThreshold) return;

    // Only summarize if history has grown significantly since last summary
    // Or just always summarize the full history into a new summary for simplicity now
    
    const summaryPrompt = `
      Summarize the following penetration testing conversation history. 
      Focus on discovered vulnerabilities, actions taken, and key findings.
      Keep it concise but technical.
      
      History:
      ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Summary:
    `;

    try {
      const response = await this.modelProvider.generateText(summaryPrompt, {
        temperature: 0.3,
        maxTokens: 500
      });

      await this.sessionEngine.setSummary(sessionId, response.text);
      console.log(`Updated summary for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to update summary for session ${sessionId}:`, error);
    }
  }
}
