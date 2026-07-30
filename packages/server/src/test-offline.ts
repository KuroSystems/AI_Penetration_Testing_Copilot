import { OllamaProvider } from './providers/ollama';

async function test() {
  console.log('Testing Ollama Provider (Offline Case)...');
  const provider = new OllamaProvider('http://localhost:11434');

  console.log('1. Testing listModels...');
  const models = await provider.listModels();
  console.log('Models found:', models);

  console.log('\n2. Testing generateText (expecting error or handling)...');
  try {
    await provider.generateText('Hi', { modelName: 'llama3' });
  } catch (error: any) {
    console.log('Caught expected error:', error.code || error.message);
  }
}

test();
