import { 
  Session, 
  CompressionEngine, 
  CompressionConfig, 
  ContextPackage,
  ChatMessage
} from '@ai-pentest/contracts';

export class TokenBudgetCompressionEngine implements CompressionEngine {
  
  // Simple heuristic: 4 characters per token
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async compress(session: Session, config: CompressionConfig): Promise<ContextPackage> {
    const { state } = session;
    const { maxTokens, reserveForResponse, shortTermHistoryLimit } = config;
    const availableTokens = maxTokens - reserveForResponse;

    let systemPromptParts = [];
    systemPromptParts.push(`Current Phase: ${state.currentPhase}`);
    
    if (state.knownFacts.length > 0) {
      systemPromptParts.push(`Known Facts:\n- ${state.knownFacts.join('\n- ')}`);
    }

    if (state.pinnedFacts && state.pinnedFacts.length > 0) {
      systemPromptParts.push(`CRITICAL Facts (Pinned):\n- ${state.pinnedFacts.join('\n- ')}`);
    }

    if (state.summary) {
      systemPromptParts.push(`Context Summary: ${state.summary}`);
    }

    const systemPrompt = systemPromptParts.join('\n\n');
    let currentTokens = this.estimateTokens(systemPrompt);

    const messages: Array<{ role: string; content: string }> = [];
    
    // Process chat history from newest to oldest
    const history = [...state.chatHistory].reverse();
    const shortTermCount = Math.min(history.length, shortTermHistoryLimit);
    
    const shortTermMessages: ChatMessage[] = [];
    
    for (let i = 0; i < shortTermCount; i++) {
      const msg = history[i];
      const msgTokens = this.estimateTokens(msg.content);
      
      if (currentTokens + msgTokens > availableTokens) break;
      
      shortTermMessages.unshift(msg);
      currentTokens += msgTokens;
    }

    return {
      systemPrompt,
      messages: shortTermMessages.map(m => ({ role: m.role, content: m.content })),
      tokenEstimate: currentTokens
    };
  }
}
