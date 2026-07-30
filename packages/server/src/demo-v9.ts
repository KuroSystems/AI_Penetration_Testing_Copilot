import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 9 Demo: Safety Layer & Rules Engine ---');
  
  try {
    // 1. Create a session
    console.log('1. Creating a session for example.com...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'example.com',
      name: 'Safety Test'
    });
    const sessionId = sessionRes.data.id;
    
    // Add some facts to ensure confidence is high enough to reach safety layer
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Target is 10.0.0.5' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'SSH is open' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Running OpenSSH 8.2' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Port 80 is open' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Running Apache' });

    // 2. Test FLAG (Destructive Action)
    console.log('\n2. Testing FLAG rule (Destructive action)...');
    const res1 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Recommended action should contain the word "exploit".',
      model: 'mock-llama3'
    });
    console.log('Action Status:', res1.data.recommendedAction);
    if (res1.data.safetyReport) {
        console.log('Safety Message:', res1.data.safetyReport.message);
    }

    // 3. Test BLOCK (Out of Scope)
    console.log('\n3. Testing BLOCK rule (Out of scope target)...');
    const res2 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Target another IP like 192.168.1.100.',
      model: 'mock-llama3'
    });
    console.log('Action Status:', res2.data.recommendedAction);
    if (res2.data.safetyReport) {
        console.log('Safety Message:', res2.data.safetyReport.message);
    }

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
