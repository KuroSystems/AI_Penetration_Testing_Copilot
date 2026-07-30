import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 10 Demo: Tool Recommendation & Command Generation ---');
  
  try {
    // 1. Create a session
    console.log('1. Creating a session for example.com...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'example.com',
      name: 'Tool Recommendation Test'
    });
    const sessionId = sessionRes.data.id;

    // Add facts to ensure high confidence
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Target IP is 1.2.3.4' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'HTTP is running' });
    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, { fact: 'Need to perform a port discovery scan' });

    // 2. Process prompt that triggers Nmap recommendation
    console.log('\n2. Processing prompt that should recommend Nmap...');
    const res1 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Suggest a command to perform a port discovery scan on the target.',
      model: 'mock-llama3'
    });
    
    console.log('Recommended Action:', res1.data.recommendedAction);
    if (res1.data.toolRecommendation) {
      console.log('Tool Recommended:', res1.data.toolRecommendation.toolId);
      console.log('Generated Command:', res1.data.toolRecommendation.command);
    } else {
        console.log('No tool recommendation returned.');
    }

    // 3. Process prompt that requires user input (Gobuster)
    console.log('\n3. Processing prompt for directory brute-force (requires wordlist)...');
    const res2 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'I want to perform a directory discovery on the web server.',
      model: 'mock-llama3'
    });
    
    console.log('Recommended Action:', res2.data.recommendedAction);
    if (res2.data.questions) {
        console.log('Clarification Question:', res2.data.questions);
    }

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
