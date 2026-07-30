import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 5 Demo: Orchestration Engine ---');
  
  try {
    // 1. Create a session
    console.log('1. Creating a session for example.com...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'example.com',
      name: 'Orchestration Test'
    });
    const sessionId = sessionRes.data.id;
    console.log(`Session ID: ${sessionId}`);

    // 2. Process a prompt via Orchestrator
    console.log('\n2. Processing first prompt via Orchestrator...');
    const genRes1 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'What is our first step?',
      model: 'mock-llama3'
    });
    console.log('Model Response:', genRes1.data.text);

    // 3. Verify history and phase-specific prompting
    console.log('\n3. Checking session state...');
    const stateRes = await axios.get(`${baseUrl}/sessions/${sessionId}`);
    console.log(`History count: ${stateRes.data.state.chatHistory.length}`);
    console.log(`Current Phase: ${stateRes.data.state.currentPhase}`);

    // 4. Change phase and see if orchestrator adapts
    console.log('\n4. Changing phase to exploitation and processing again...');
    await axios.patch(`${baseUrl}/sessions/${sessionId}/state`, {
      currentPhase: 'exploitation'
    });
    
    const genRes2 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Ready for next steps.',
      model: 'mock-llama3'
    });
    console.log('Model Response:', genRes2.data.text);

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
