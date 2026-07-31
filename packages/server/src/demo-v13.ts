import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 13 Demo: Output Formatter & Streaming Engine ---');
  
  try {
    // 1. Create a session
    console.log('1. Creating a session...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'example.com',
      name: 'Streaming Test'
    });
    const sessionId = sessionRes.data.id;

    // 2. Process with streaming
    console.log('\n2. Processing prompt with STREAMING (SSE)...');
    const response = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Begin the recon phase.',
      model: 'mock-llama3',
      stream: true
    }, { responseType: 'stream' });

    console.log('Receiving chunks:');
    response.data.on('data', (chunk: any) => {
      const line = chunk.toString();
      if (line.includes('data: {"chunk"')) {
          const json = JSON.parse(line.replace('data: ', ''));
          process.stdout.write(json.chunk);
      }
    });

    response.data.on('end', () => {
      console.log('\n\n--- Stream Completed ---');
    });

  } catch (error: any) {
    console.error('Demo failed:', error.message);
  }
}

demo();
