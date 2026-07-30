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
import { ConfidenceScoringEngine } from './confidence-engine';
import { ClarificationEngine } from './clarification-engine';
import { WorkflowEngine } from './workflow-engine';
import { RulesEngine } from './rules-engine';
import { ToolRecommendationEngine } from './tool-recommendation-engine';
import { CommandGenerationEngine } from './command-generation-engine';
import { RuleAction } from '@ai-pentest/contracts';

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
  private confidenceEngine: ConfidenceScoringEngine;
  private clarificationEngine: ClarificationEngine;
  private workflowEngine: WorkflowEngine;
  private rulesEngine: RulesEngine;
  private toolRecommendationEngine: ToolRecommendationEngine;
  private commandGenerationEngine: CommandGenerationEngine;
  private modelProvider: ModelProvider;
  private config: OrchestratorConfig;

  constructor(
    promptRegistry: PromptRegistry,
    promptLoader: PromptLoader,
    sessionEngine: SessionStateEngine,
    compressionEngine: TokenBudgetCompressionEngine,
    memoryEngine: MemoryEngine,
    workflowEngine: WorkflowEngine,
    rulesEngine: RulesEngine,
    toolRecommendationEngine: ToolRecommendationEngine,
    modelProvider: ModelProvider,
    config?: Partial<OrchestratorConfig>
  ) {
    this.promptRegistry = promptRegistry;
    this.promptLoader = promptLoader;
    this.sessionEngine = sessionEngine;
    this.compressionEngine = compressionEngine;
    this.memoryEngine = memoryEngine;
    this.workflowEngine = workflowEngine;
    this.rulesEngine = rulesEngine;
    this.toolRecommendationEngine = toolRecommendationEngine;
    this.commandGenerationEngine = new CommandGenerationEngine();
    this.modelProvider = modelProvider;
    this.reasoningEngine = new ReasoningEngine(modelProvider);
    this.confidenceEngine = new ConfidenceScoringEngine();
    this.clarificationEngine = new ClarificationEngine(modelProvider);
    
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

    // 7. Workflow Stage Transition (Phase 8)
    if (decision.currentPhase && decision.currentPhase !== updatedSession.state.currentPhase) {
      try {
        const workflowId = updatedSession.metadata.workflowId || 'standard-pentest';
        await this.sessionEngine.transitionStage(sessionId, decision.currentPhase, (from, to) => {
          return this.workflowEngine.validateTransition(workflowId, from, to);
        });
        console.log(`Transitioned session ${sessionId} to phase: ${decision.currentPhase}`);
      } catch (err: any) {
        console.warn(`Attempted invalid transition: ${err.message}`);
        // We continue, but the session state remains in the old phase
      }
    }

    // 8. Confidence & Clarification Logic (Phase 7)
    const confidenceResult = this.confidenceEngine.calculate(updatedSession);
    
    let finalResult: any = decision;
    let assistantMessage = '';

    if (decision.needsClarification || !confidenceResult.isAdequate) {
      console.log(`Low confidence (${confidenceResult.score.toFixed(2)}) or explicit clarification request.`);
      const questions = await this.clarificationEngine.generateQuestions(updatedSession, decision.rationale);
      
      assistantMessage = questions;
      finalResult = {
        ...decision,
        recommendedAction: 'Clarification Required',
        questions,
        confidence: confidenceResult.score
      };
    } else {
      // 10. Tool Recommendation & Command Generation (Phase 10)
      const recommendations = this.toolRecommendationEngine.recommend(decision, updatedSession);
      let toolInfo = '';
      let toolData = null;

      if (recommendations.length > 0) {
        const topTool = recommendations[0].tool;
        const generated = this.commandGenerationEngine.generate(topTool, updatedSession);
        
        if (generated.missingParameters.length === 0) {
          toolInfo = `\n\nSuggested Command:\n\`\`\`bash\n${generated.command}\n\`\`\`\n(${generated.explanation})`;
          toolData = {
            toolId: topTool.id,
            command: generated.command,
            explanation: generated.explanation
          };
        } else {
          // Missing params
          const missing = generated.missingParameters.map(p => p.name).join(', ');
          toolInfo = `\n\nI recommend using ${topTool.name}, but I need more information: ${missing}`;
          toolData = { toolId: topTool.id, missingParameters: generated.missingParameters };
        }
      }

      // 9. Safety Layer (Phase 9)
      const safetyReport = this.rulesEngine.evaluate(decision, updatedSession);
      
      if (safetyReport.action === RuleAction.BLOCK) {
        console.warn(`Action BLOCKED by safety rules: ${safetyReport.message}`);
        assistantMessage = `I cannot recommend the next step because it violates safety rules: ${safetyReport.message}`;
        finalResult = {
          ...decision,
          recommendedAction: 'BLOCKED',
          safetyReport
        };
      } else if (safetyReport.action === RuleAction.FLAG) {
        console.log(`Action FLAGED for confirmation: ${safetyReport.message}`);
        assistantMessage = `WARNING: ${safetyReport.message}\n\nPlease confirm if you want to proceed with: ${decision.recommendedAction}${toolInfo}`;
        finalResult = {
          ...decision,
          recommendedAction: 'NEEDS_CONFIRMATION',
          safetyReport,
          toolRecommendation: toolData
        };
      } else {
        assistantMessage = `Phase: ${decision.currentPhase}\nRecommended Action: ${decision.recommendedAction}\nRationale: ${decision.rationale}${toolInfo}`;
        finalResult = {
          ...decision,
          confidence: confidenceResult.score,
          safetyReport,
          toolRecommendation: toolData
        };

        // If tool was missing params and not blocked/flagged, override to clarification
        if (toolData && 'missingParameters' in toolData) {
            finalResult.recommendedAction = 'Clarification Required';
            finalResult.questions = `To run ${toolData.toolId}, please provide: ${toolData.missingParameters.map((p: any) => p.name).join(', ')}`;
        }
      }
    }

    // 8. Update Session with Assistant Response
    await this.sessionEngine.addChatMessage(sessionId, 'assistant', assistantMessage);
    await this.sessionEngine.recordAction(sessionId, 'orchestrator_decision', finalResult);
    await this.sessionEngine.updateState(sessionId, { confidenceSnapshot: confidenceResult.score });

    // 9. Trigger Background Memory Refresh (Async)
    this.memoryEngine.refreshLongTermMemory(sessionId).catch(err => 
      console.error('Background memory refresh failed:', err)
    );

    return finalResult;
  }
}
