import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 2 Demo: Prompt Module System API ---');
  
  try {
    console.log('1. Checking Prompts List...');
    const prompts = await axios.get(`${baseUrl}/prompts`);
    console.log(`Found ${prompts.data.length} prompt modules.`);
    prompts.data.forEach((p: any) => console.log(` - ${p.id} v${p.version}`));

    console.log('\n2. Testing Generate with Tags...');
    const generate = await axios.post(`${baseUrl}/generate`, {
      tags: ['core'],
      variables: { date: '2026-07-30' },
      prompt: 'What is your current mission?',
      model: 'mock-llama3'
    });
    console.log('Generate Response:', generate.data.text);
    
    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
