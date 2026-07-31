import express, { Request, Response } from 'express';
import cors from 'cors';
import { OllamaProvider } from './providers/ollama';
import { MockModelProvider } from './providers/mock';
import { ModelProvider } from '@ai-pentest/contracts';
import { PromptRegistry } from './registry/prompt-registry';
import { PromptLoader } from './registry/prompt-loader';
import { FileSessionRepository } from './persistence/file-session-repository';
import { SessionStateEngine } from './engine/session-state-engine';
import { TokenBudgetCompressionEngine } from './engine/compression-engine';
import { MemoryEngine } from './engine/memory-engine';
import { OrchestrationEngine } from './engine/orchestration-engine';
import { WorkflowEngine } from './engine/workflow-engine';
import { RulesEngine } from './engine/rules-engine';
import { ToolRecommendationEngine } from './engine/tool-recommendation-engine';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Workflow setup
const workflowRegistryPath = path.join(__dirname, 'registry', 'workflows');
const workflowEngine = new WorkflowEngine(workflowRegistryPath);
workflowEngine.load().then(() => {
  console.log('Workflow Registry loaded.');
});

// Safety Rules setup
const rulesRegistryPath = path.join(__dirname, 'registry', 'rules');
const rulesEngine = new RulesEngine(rulesRegistryPath);
rulesEngine.load().then(() => {
  console.log('Safety Rules Registry loaded.');
});

// Tool Catalog setup
const toolRegistryPath = path.join(__dirname, 'registry', 'tools');
<<<<<<< Updated upstream
const toolRecommendationEngine = new ToolRecommendationEngine(toolRegistryPath);
toolRecommendationEngine.load().then(() => {
  console.log('Tool Registry loaded.');
=======
const guiToolRegistryPath = path.join(__dirname, 'registry', 'gui-tools');
const toolRecommendationEngine = new ToolRecommendationEngine(toolRegistryPath, guiToolRegistryPath);
toolRecommendationEngine.load().then(() => {
  console.log('Tool Registries loaded.');
>>>>>>> Stashed changes
});

// Persistence & Engine setup
const sessionRepo = new FileSessionRepository(path.join(__dirname, 'persistence', 'sessions'));
const sessionEngine = new SessionStateEngine(sessionRepo);
const compressionEngine = new TokenBudgetCompressionEngine();

// Registry setup
const promptRegistry = new PromptRegistry(path.join(__dirname, 'registry', 'prompts'));
const promptLoader = new PromptLoader(promptRegistry);

// Load prompts on startup
promptRegistry.load().then(() => {
  console.log('Prompt Registry loaded.');
});

let modelProvider: ModelProvider;

if (process.env.USE_MOCK === 'true') {
  console.log('Using Mock Model Provider');
  modelProvider = new MockModelProvider();
} else {
  modelProvider = new OllamaProvider(process.env.OLLAMA_URL || 'http://localhost:11434');
}

const memoryEngine = new MemoryEngine(modelProvider, sessionEngine);

const orchestrator = new OrchestrationEngine(
  promptRegistry,
  promptLoader,
  sessionEngine,
  compressionEngine,
  memoryEngine,
  workflowEngine,
  rulesEngine,
  toolRecommendationEngine,
  modelProvider
);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), provider: modelProvider.id });
});

// List models
app.get('/models', async (req: Request, res: Response) => {
  try {
    // Note: ModelProvider interface in contracts might need listModels if we want it generic
    // For now we cast or check if the method exists
    if ('listModels' in modelProvider) {
      const models = await (modelProvider as any).listModels();
      res.json({ models });
    } else {
      res.status(501).json({ error: 'Not implemented for this provider' });
    }
  } catch (error: any) {
    res.status(503).json({ error: 'Service unavailable', details: error.message });
  }
});

// Generate text
app.post('/generate', async (req: Request, res: Response) => {
  const { prompt, model, stream, tags, variables, sessionId } = req.body;
  
  try {
    if (sessionId) {
      // Use the Orchestration Engine if sessionId is provided
      const result = await orchestrator.process(sessionId, prompt, { modelName: model });
      res.json(result);
    } else {
      // Legacy / stateless path
      let finalPrompt = prompt;
      if (tags && Array.isArray(tags)) {
        const assembledPrompt = promptLoader.assemble(tags, variables || {});
        finalPrompt = assembledPrompt + (prompt ? '\n\n' + prompt : '');
      }
      
      const result = await modelProvider.generateText(finalPrompt || '', { modelName: model });
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Generation failed', details: error.message });
  }
});

// Prompt Registry Endpoints
app.get('/prompts', (req: Request, res: Response) => {
  res.json(promptRegistry.listAll());
});

app.post('/prompts/reload', async (req: Request, res: Response) => {
  await promptRegistry.load();
  res.json({ message: 'Registry reloaded' });
});

// Session Management Endpoints
app.post('/sessions', async (req: Request, res: Response) => {
  const { target, name } = req.body;
  if (!target) return res.status(400).json({ error: 'Target is required' });
  
  try {
    const session = await sessionEngine.createSession(target, name);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/sessions', async (req: Request, res: Response) => {
  const sessions = await sessionEngine.listSessions();
  res.json(sessions);
});

app.get('/sessions/:id', async (req: Request, res: Response) => {
  const session = await sessionEngine.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

app.patch('/sessions/:id/state', async (req: Request, res: Response) => {
  try {
    const session = await sessionEngine.updateState(req.params.id, req.body);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/sessions/:id/facts', async (req: Request, res: Response) => {
  const { fact } = req.body;
  if (!fact) return res.status(400).json({ error: 'Fact is required' });
  try {
    const session = await sessionEngine.addFact(req.params.id, fact);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/sessions/:id/context', async (req: Request, res: Response) => {
  try {
    const session = await sessionEngine.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    const config = {
      maxTokens: parseInt(req.query.maxTokens as string) || 4000,
      reserveForResponse: parseInt(req.query.reserveForResponse as string) || 500,
      shortTermHistoryLimit: parseInt(req.query.shortTermHistoryLimit as string) || 20
    };
    
    const context = await compressionEngine.compress(session, config);
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/sessions/:id/memory/refresh', async (req: Request, res: Response) => {
  try {
    await memoryEngine.refreshLongTermMemory(req.params.id);
    res.json({ message: 'Memory refresh triggered' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow Endpoints
app.get('/workflows', (req: Request, res: Response) => {
  res.json(workflowEngine.listAll());
});

app.post('/workflows/reload', async (req: Request, res: Response) => {
  await workflowEngine.load();
  res.json({ message: 'Workflows reloaded' });
});

// Safety Rules Endpoints
app.get('/rules', (req: Request, res: Response) => {
  res.json(rulesEngine.listAll());
});

app.post('/rules/reload', async (req: Request, res: Response) => {
  await rulesEngine.load();
  res.json({ message: 'Safety rules reloaded' });
});

app.listen(port, () => {
  console.log(`Backend skeleton listening at http://localhost:${port}`);
});
