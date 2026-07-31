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
import { OutputFormatter } from './engine/output-formatter';
import { AuditEngine } from './engine/audit-engine';
import { KnowledgeBaseEngine } from './engine/knowledge-engine';
import { ConfigManager } from './engine/config-manager';
import { ModelManager } from './engine/model-manager';
import { PluginManager } from './engine/plugin-manager';
import { InternalEventBus } from './engine/event-bus';
import { TelemetryEngine } from './engine/telemetry-engine';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Plugin setup
const pluginsDir = path.join(__dirname, '..', 'plugins');
const pluginManager = new PluginManager(pluginsDir);
pluginManager.loadPlugins().then(() => {
    console.log('Plugins loaded.');
});

// Infrastructure
const eventBus = new InternalEventBus();
const telemetryEngine = new TelemetryEngine(eventBus);

// Config setup
const configDir = path.join(__dirname, 'persistence', 'config');
const configManager = new ConfigManager(configDir);
const appConfig = configManager.getConfig();

// Model Provider setup
let modelProvider: ModelProvider;
if (process.env.USE_MOCK === 'true' || appConfig.useMock) {
  console.log('Using Mock Model Provider');
  modelProvider = new MockModelProvider();
} else {
  modelProvider = new OllamaProvider(appConfig.ollamaUrl);
}

// Model Manager
const modelManager = new ModelManager(modelProvider);

// Workflow setup
const workflowRegistryPath = path.join(__dirname, 'registry', 'workflows');
const workflowEngine = new WorkflowEngine(workflowRegistryPath);
workflowEngine.load();

// Safety Rules setup
const rulesRegistryPath = path.join(__dirname, 'registry', 'rules');
const rulesEngine = new RulesEngine(rulesRegistryPath);
rulesEngine.load();

// Tool Catalog setup
const toolRegistryPath = path.join(__dirname, 'registry', 'tools');
const guiToolRegistryPath = path.join(__dirname, 'registry', 'gui-tools');
const toolRecommendationEngine = new ToolRecommendationEngine(toolRegistryPath, guiToolRegistryPath);
toolRecommendationEngine.load();

// Formatter setup
const formatterRegistryPath = path.join(__dirname, 'registry', 'formatters');
const outputFormatter = new OutputFormatter(formatterRegistryPath);
outputFormatter.load();

// Audit setup
const auditLogDir = path.join(__dirname, 'persistence', 'logs');
const auditEngine = new AuditEngine(auditLogDir);

// Knowledge Base setup
const knowledgeRegistryPath = path.join(__dirname, 'registry', 'knowledge-packs');
const knowledgeEngine = new KnowledgeBaseEngine(knowledgeRegistryPath);
knowledgeEngine.load();

// Persistence & Engine setup
const sessionRepo = new FileSessionRepository(path.join(__dirname, 'persistence', 'sessions'));
const sessionEngine = new SessionStateEngine(sessionRepo);
const compressionEngine = new TokenBudgetCompressionEngine();

// Registry setup
const promptRegistry = new PromptRegistry(path.join(__dirname, 'registry', 'prompts'));
const promptLoader = new PromptLoader(promptRegistry);
promptRegistry.load();

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
  outputFormatter,
  auditEngine,
  knowledgeEngine,
  configManager,
  eventBus,
  modelProvider
);

app.use(cors());
app.use(express.json());

// Config Endpoints
app.get('/config', (req, res) => {
    res.json(configManager.getConfig());
});

app.patch('/config', (req, res) => {
    const newConfig = configManager.updateConfig(req.body);
    if (req.body.ollamaUrl || req.body.useMock !== undefined) {
        if (newConfig.useMock) {
            modelProvider = new MockModelProvider();
        } else {
            modelProvider = new OllamaProvider(newConfig.ollamaUrl);
        }
        modelManager.setProvider(modelProvider);
        orchestrator.setProvider(modelProvider);
    }
    res.json(newConfig);
});

// Telemetry Endpoint
app.get('/telemetry', (req, res) => {
    res.json(telemetryEngine.getMetrics());
});

// Model Manager Endpoints
app.get('/models/available', async (req, res) => {
    try {
        const models = await modelManager.getAvailableModels();
        res.json({ models });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/models/pull', async (req, res) => {
    const { modelName } = req.body;
    try {
        await modelManager.pullModel(modelName);
        res.json({ message: `Pulling model ${modelName} started` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Generate text
app.post('/generate', async (req: Request, res: Response) => {
  const { prompt, model, stream, tags, variables, sessionId } = req.body;
  try {
    if (sessionId) {
      const isStreaming = stream !== undefined ? stream : configManager.getConfig().model.streaming;
      if (isStreaming) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const result = await orchestrator.process(sessionId, prompt, { modelName: model }, (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        });
        res.write(`data: ${JSON.stringify({ finalResult: result })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const result = await orchestrator.process(sessionId, prompt, { modelName: model });
        res.json(result);
      }
    } else {
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
  const { target, name, workflowId } = req.body;
  if (!target) return res.status(400).json({ error: 'Target is required' });
  try {
    const session = await sessionEngine.createSession(target, name, workflowId);
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
      maxTokens: parseInt(req.query.maxTokens as string) || configManager.getConfig().model.contextLength,
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

app.get('/sessions/:id/audit', (req: Request, res: Response) => {
    res.json(auditEngine.getLogBySession(req.params.id));
});

app.get('/audit/verify', (req: Request, res: Response) => {
    res.json({ valid: auditEngine.verifyChain() });
});

// Plugin Endpoints
app.get('/plugins', (req: Request, res: Response) => {
    res.json(pluginManager.listPlugins());
});

app.post('/plugins/reload', async (req: Request, res: Response) => {
    await pluginManager.loadPlugins();
    res.json({ message: 'Plugins reloaded' });
});

app.listen(port, () => {
  console.log(`Backend skeleton listening at http://localhost:${port}`);
});
