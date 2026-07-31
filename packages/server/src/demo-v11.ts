import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 11 Demo: GUI Navigation Engine ---');
  
  try {
    // 1. Create a session
    console.log('1. Creating a session...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'http://test-site.com/login',
      name: 'GUI Navigation Test'
    });
    const sessionId = sessionRes.data.id;

    // Add facts to boost confidence
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'HTTP login page found at /login' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Target IP is 10.0.0.1' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Using analysis phase' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Found parameter id' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Need to test for IDOR' });
    
    await axios.patch(`${baseUrl}/sessions/${sessionId}/state`, { currentPhase: 'analysis' });

    // 2. Process prompt that triggers Burp recommendation
    console.log('\n2. Processing prompt that should recommend Burp Suite (GUI)...');
    const res = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'How do I manually test the id parameter in Burp Suite Repeater?',
      model: 'mock-llama3'
    });
    
    console.log('Recommended Action:', res.data.recommendedAction);
    if (res.data.toolRecommendation && res.data.toolRecommendation.type === 'gui') {
      console.log('Tool Recommended:', res.data.toolRecommendation.toolId);
      console.log('GUI Steps Generated:');
      res.data.toolRecommendation.steps.forEach((s: any, idx: number) => {
          console.log(`${idx + 1}. ${s.action}: ${s.description}`);
      });
    } else {
        console.log('No GUI tool recommendation returned.');
    }

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
