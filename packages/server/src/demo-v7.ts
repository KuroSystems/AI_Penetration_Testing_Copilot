import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 7 Demo: Confidence & Clarification Engine ---');
  
  try {
    // 1. Create a session with very sparse info
    console.log('1. Creating a sparse session...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'unknown-target.local',
      name: 'Confidence Test'
    });
    const sessionId = sessionRes.data.id;
    console.log(`Session ID: ${sessionId}`);

    // 2. Process via Orchestrator (expecting low confidence/clarification)
    console.log('\n2. Processing first prompt with no facts...');
    const res1 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'What should I do?',
      model: 'mock-llama3'
    });
    
    console.log('Response Type:', res1.data.recommendedAction);
    if (res1.data.questions) {
      console.log('Clarification Questions Generated:\n', res1.data.questions);
    }

    // 3. Add facts and re-process
    console.log('\n3. Adding facts to increase confidence...');
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, {
      fact: 'Target IP is 192.168.1.50'
    });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, {
      fact: 'Port 445 is open'
    });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, {
      fact: 'Running SMBv1'
    });

    console.log('\n4. Processing again with more facts...');
    const res2 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Next step now?',
      model: 'mock-llama3'
    });
    
    console.log('Response Action:', res2.data.recommendedAction);
    console.log('Confidence:', res2.data.confidence);

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
