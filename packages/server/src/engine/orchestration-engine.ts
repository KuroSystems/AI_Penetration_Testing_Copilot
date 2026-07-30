import { 
  Session, 
  ModelProvider, 
  ContextPackage,
  ModelConfig
} from '@ai-pentest/contracts';
import { PromptRegistry } from '../registry/prompt-registry';
import { PromptLoader } from '../registry/prompt-loader';
import { SessionStateEngine } from './session-state-engine';
import { TokenBudgetCompressionEngine } from './compression-engine';
import { MemoryEngine } from './memory-engine';
import { ReasoningEngine } from './reasoning-engine';

export interface PipelineStep {
  category?: string;
  tags?: string[];
  priority: number;
}

export interface OrchestratorConfig {
  pipeline: PipelineStep[];
  compression: {
    maxTokens: number;
    reserveForResponse: number;
    shortTermHistoryLimit: number;
  };
}

export class OrchestrationEngine {
  private promptRegistry: PromptRegistry;
  private promptLoader: PromptLoader;
  private sessionEngine: SessionStateEngine;
  private compressionEngine: TokenBudgetCompressionEngine;
  private memoryEngine: MemoryEngine;
  private reasoningEngine: ReasoningEngine;
  private modelProvider: ModelProvider;
  private config: OrchestratorConfig;

  constructor(
    promptRegistry: PromptRegistry,
    promptLoader: PromptLoader,
    sessionEngine: SessionStateEngine,
    compressionEngine: TokenBudgetCompressionEngine,
    memoryEngine: MemoryEngine,
    modelProvider: ModelProvider,
    config?: Partial<OrchestratorConfig>
  ) {
    this.promptRegistry = promptRegistry;
    this.promptLoader = promptLoader;
    this.sessionEngine = sessionEngine;
    this.compressionEngine = compressionEngine;
    this.memoryEngine = memoryEngine;
    this.modelProvider = modelProvider;
    this.reasoningEngine = new ReasoningEngine(modelProvider);
    
    this.config = {
      pipeline: [
        { tags: ['core'], priority: 100 },
        { tags: ['phase-specific'], priority: 50 }
      ],
      compression: {
        maxTokens: 4000,
        reserveForResponse: 500,
        shortTermHistoryLimit: 20
      },
      ...config
    };
  }

  async process(sessionId: string, userPrompt?: string, modelConfig?: Partial<ModelConfig>): Promise<any> {
    const session = await this.sessionEngine.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    // 1. Add user message to history if present
    if (userPrompt) {
      await this.sessionEngine.addChatMessage(sessionId, 'user', userPrompt);
    }

    // 2. Fetch fresh session state after history update
    const updatedSession = await this.sessionEngine.getSession(sessionId);
    if (!updatedSession) throw new Error('Session lost after update');

    // 3. Assemble System Prompt from Pipeline
    const tags = this.config.pipeline
      .sort((a, b) => b.priority - a.priority)
      .flatMap(step => step.tags || []);
    
    // Add phase-specific and reasoning tags
    tags.push(updatedSession.state.currentPhase);
    tags.push('reasoning');
    
    const variables = {
      target: updatedSession.target,
      phase: updatedSession.state.currentPhase,
      date: new Date().toISOString().split('T')[0]
    };

    const baseSystemPrompt = this.promptLoader.assemble(tags, variables);

    // 4. Get Compressed Context (pinned facts, summary, sliding window)
    const context = await this.compressionEngine.compress(updatedSession, this.config.compression);

    // 5. Compose Final Request
    const finalSystemPrompt = `${baseSystemPrompt}\n\n${context.systemPrompt}`;
    const messages = [...context.messages];
    
    const combinedPrompt = `${finalSystemPrompt}\n\n` + 
      messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    console.log('--- ORCHESTRATION DEBUG ---');
    console.log('Active Tags:', tags);
    console.log('System Prompt Length:', finalSystemPrompt.length);
    console.log('Messages in Context:', messages.length);
    console.log('---------------------------');

    // 6. Call Reasoning Engine
    const decision = await this.reasoningEngine.think(combinedPrompt);

    // 7. Update Session with Assistant Response (Reasoning Result)
    const assistantContent = `Phase: ${decision.currentPhase}\nRecommended Action: ${decision.recommendedAction}\nRationale: ${decision.rationale}`;
    await this.sessionEngine.addChatMessage(sessionId, 'assistant', assistantContent);
    await this.sessionEngine.recordAction(sessionId, 'reasoning_decision', decision);

    // 8. Trigger Background Memory Refresh (Async)
    this.memoryEngine.refreshLongTermMemory(sessionId).catch(err => 
      console.error('Background memory refresh failed:', err)
    );

    return decision;
  }
}
