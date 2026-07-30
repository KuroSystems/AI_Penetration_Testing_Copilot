import axios from 'axios';

async function demo() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('--- Phase 1 Demo: Backend Skeleton & Model Provider ---');
  
  try {
    console.log('1. Checking Health...');
    const health = await axios.get(`${baseUrl}/health`);
    console.log('Health Response:', health.data);

    console.log('\n2. Listing Models...');
    const models = await axios.get(`${baseUrl}/models`);
    console.log('Models Response:', models.data);

    console.log('\n3. Sending Prompt (Ping)...');
    const generate = await axios.post(`${baseUrl}/generate`, {
      prompt: 'Who is the best pentester?',
      model: 'mock-llama3'
    });
    console.log('Generate Response:', generate.data);
    
    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
