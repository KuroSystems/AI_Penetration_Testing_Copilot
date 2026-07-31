import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 12 Demo: Response Validator & Hallucination Guard ---');
  
  try {
    // 1. Create a session
    console.log('1. Creating a session for example.com...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'example.com',
      name: 'Validation Test'
    });
    const sessionId = sessionRes.data.id;

    // 2. Test Multi-Action Linter (Mock will return a single action usually, so we'll need to force it or mock it)
    // Actually, let's update the mock to return a multi-action response if prompted.
    console.log('\n2. Testing Multi-Action Linter (forces linter failure & fallback)...');
    const res1 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'FORCE_MULTI_ACTION: Do X and then do Y.',
      model: 'mock-llama3'
    });
    
    console.log('Response Action:', res1.data.recommendedAction);
    if (res1.data.validationErrors) {
        console.log('Validation Errors caught:', res1.data.validationErrors);
    }

    // 3. Test Grounding (Unknown Identifier)
    console.log('\n3. Testing Grounding (Unknown identifier)...');
    const res2 = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'FORCE_UNGROUNDED: Target 8.8.8.8.',
      model: 'mock-llama3'
    });
    
    console.log('Response Action:', res2.data.recommendedAction);
    if (res2.data.validationErrors) {
        console.log('Validation Errors caught:', res2.data.validationErrors);
    }

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.response?.data || error.message);
  }
}

demo();
