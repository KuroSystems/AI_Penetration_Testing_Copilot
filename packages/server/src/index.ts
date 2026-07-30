import express, { Request, Response } from 'express';
import cors from 'cors';
import { OllamaProvider } from './providers/ollama';
import { MockModelProvider } from './providers/mock';
import { ModelProvider } from '@ai-pentest/contracts';

const app = express();
const port = process.env.PORT || 3000;

let modelProvider: ModelProvider;

if (process.env.USE_MOCK === 'true') {
  console.log('Using Mock Model Provider');
  modelProvider = new MockModelProvider();
} else {
  modelProvider = new OllamaProvider(process.env.OLLAMA_URL || 'http://localhost:11434');
}

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
  const { prompt, model, stream } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    if (stream && modelProvider.streamText) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = modelProvider.streamText(prompt, { modelName: model });
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const result = await modelProvider.generateText(prompt, { modelName: model });
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Generation failed', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend skeleton listening at http://localhost:${port}`);
});
