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
import { GuiNavigationEngine } from './gui-navigation-engine';
import { ResponseValidator } from './response-validator';
import { RuleAction, ToolDefinition, GuiToolDefinition } from '@ai-pentest/contracts';

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
  private guiNavigationEngine: GuiNavigationEngine;
  private responseValidator: ResponseValidator;
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
    this.guiNavigationEngine = new GuiNavigationEngine();
    this.responseValidator = new ResponseValidator();
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

    if (userPrompt) {
      await this.sessionEngine.addChatMessage(sessionId, 'user', userPrompt);
    }

    const updatedSession = await this.sessionEngine.getSession(sessionId);
    if (!updatedSession) throw new Error('Session lost after update');

    const tags = this.config.pipeline
      .sort((a, b) => b.priority - a.priority)
      .flatMap(step => step.tags || []);
    
    tags.push(updatedSession.state.currentPhase);
    tags.push('reasoning');
    
    const variables = {
      target: updatedSession.target,
      phase: updatedSession.state.currentPhase,
      date: new Date().toISOString().split('T')[0]
    };

    const baseSystemPrompt = this.promptLoader.assemble(tags, variables);
    const context = await this.compressionEngine.compress(updatedSession, this.config.pipeline.length > 0 ? this.config.compression : { maxTokens: 4000, reserveForResponse: 500, shortTermHistoryLimit: 20 });

    const finalSystemPrompt = `${baseSystemPrompt}\n\n${context.systemPrompt}`;
    const messages = [...context.messages];
    
    const combinedPrompt = `${finalSystemPrompt}\n\n` + 
      messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    // 6. Call Reasoning Engine with Retry & Validation (Phase 12)
    let decision: any;
    let validationResult: any;

    for (let attempt = 0; attempt < 2; attempt++) {
      decision = await this.reasoningEngine.think(combinedPrompt);
      validationResult = this.responseValidator.validate(decision, updatedSession);
      
      if (validationResult.isValid) break;
      
      console.warn(`Reasoning validation failed on attempt ${attempt + 1}: ${validationResult.errors.join(', ')}`);
      // Optional: Adjust prompt for retry if we had a more advanced logic
    }

    if (!validationResult.isValid) {
      console.error('Final decision validation failed. Falling back to clarification.');
      const questions = "I'm having trouble formulating the next step accurately. Could you provide more details about the target or previous findings?";
      const fallbackResult = {
        ...decision,
        recommendedAction: 'Clarification Required',
        questions,
        validationErrors: validationResult.errors
      };
      await this.sessionEngine.addChatMessage(sessionId, 'assistant', questions);
      return fallbackResult;
    }

    // 7. Workflow Stage Transition (Phase 8)
    if (decision.currentPhase && decision.currentPhase !== updatedSession.state.currentPhase) {
      try {
        const workflowId = updatedSession.metadata.workflowId || 'standard-pentest';
        await this.sessionEngine.transitionStage(sessionId, decision.currentPhase, (from, to) => {
          return this.workflowEngine.validateTransition(workflowId, from, to);
        });
      } catch (err: any) {
        console.warn(`Attempted invalid transition: ${err.message}`);
      }
    }

    // 8. Confidence & Clarification Logic (Phase 7)
    const confidenceResult = this.confidenceEngine.calculate(updatedSession);
    
    let finalResult: any = decision;
    let assistantMessage = '';

    if (decision.needsClarification || !confidenceResult.isAdequate) {
      const questions = await this.clarificationEngine.generateQuestions(updatedSession, decision.rationale);
      assistantMessage = questions;
      finalResult = {
        ...decision,
        recommendedAction: 'Clarification Required',
        questions,
        confidence: confidenceResult.score
      };
    } else {
        // 10. Tool Recommendation & Command Generation (Phase 10 & 11)
        const recommendations = this.toolRecommendationEngine.recommend(decision, updatedSession);
        let toolInfo = '';
        let toolData: any = null;

        if (recommendations.length > 0) {
          const topRec = recommendations[0];
          if (topRec.type === 'cli') {
            const tool = topRec.tool as ToolDefinition;
            const generated = this.commandGenerationEngine.generate(tool, updatedSession);
            if (generated.missingParameters.length === 0) {
              toolInfo = `\n\nSuggested Command:\n\`\`\`bash\n${generated.command}\n\`\`\`\n(${generated.explanation})`;
              toolData = { toolId: tool.id, type: 'cli', command: generated.command, explanation: generated.explanation };
            } else {
              const missing = generated.missingParameters.map(p => p.name).join(', ');
              toolInfo = `\n\nI recommend using ${tool.name}, but I need more information: ${missing}`;
              toolData = { toolId: tool.id, type: 'cli', missingParameters: generated.missingParameters };
            }
          } else {
            const tool = topRec.tool as GuiToolDefinition;
            const generated = this.guiNavigationEngine.generate(tool, updatedSession);
            if (generated.missingParameters.length === 0) {
              toolInfo = `\n\nSuggested GUI Steps for ${tool.name}:\n` + 
                generated.steps.map((s, idx) => `${idx + 1}. **${s.action}**: ${s.description}`).join('\n');
              toolData = { toolId: tool.id, type: 'gui', steps: generated.steps, explanation: tool.description };
            } else {
              const missing = generated.missingParameters.map(p => p.name).join(', ');
              toolInfo = `\n\nI recommend using ${tool.name}, but I need more information: ${missing}`;
              toolData = { toolId: tool.id, type: 'gui', missingParameters: generated.missingParameters };
            }
          }
        }

      const safetyReport = this.rulesEngine.evaluate(decision, updatedSession);
      
      if (safetyReport.action === RuleAction.BLOCK) {
        assistantMessage = `I cannot recommend the next step because it violates safety rules: ${safetyReport.message}`;
        finalResult = { ...decision, recommendedAction: 'BLOCKED', safetyReport };
      } else if (safetyReport.action === RuleAction.FLAG) {
        assistantMessage = `WARNING: ${safetyReport.message}\n\nPlease confirm if you want to proceed with: ${decision.recommendedAction}${toolInfo}`;
        finalResult = { ...decision, recommendedAction: 'NEEDS_CONFIRMATION', safetyReport, toolRecommendation: toolData };
      } else {
        assistantMessage = `Phase: ${decision.currentPhase}\nRecommended Action: ${decision.recommendedAction}\nRationale: ${decision.rationale}${toolInfo}`;
        finalResult = { ...decision, confidence: confidenceResult.score, safetyReport, toolRecommendation: toolData };

        if (toolData && 'missingParameters' in toolData) {
            finalResult.recommendedAction = 'Clarification Required';
            finalResult.questions = `To run ${toolData.toolId}, please provide: ${toolData.missingParameters.map((p: any) => p.name).join(', ')}`;
        }
      }
    }

    await this.sessionEngine.addChatMessage(sessionId, 'assistant', assistantMessage);
    await this.sessionEngine.recordAction(sessionId, 'orchestrator_decision', finalResult);
    await this.sessionEngine.updateState(sessionId, { confidenceSnapshot: confidenceResult.score });

    this.memoryEngine.refreshLongTermMemory(sessionId).catch(err => 
      console.error('Background memory refresh failed:', err)
    );

    return finalResult;
  }
}
