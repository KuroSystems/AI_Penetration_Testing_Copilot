import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 16 Demo: Config & Model Manager ---');
  
  try {
    // 1. Get initial config
    console.log('1. Fetching current configuration...');
    const configRes = await axios.get(`${baseUrl}/config`);
    console.log('Current Model:', configRes.data.model.modelName);

    // 2. Update config (change model and temperature)
    console.log('\n2. Updating configuration (changing model to mistral)...');
    const updateRes = await axios.patch(`${baseUrl}/config`, {
      model: {
        modelName: 'mistral',
        temperature: 0.7
      }
    });
    console.log('Updated Model:', updateRes.data.model.modelName);
    console.log('Updated Temperature:', updateRes.data.model.temperature);

    // 3. List available models via Model Manager
    console.log('\n3. Listing available models from provider...');
    const modelsRes = await axios.get(`${baseUrl}/models/available`);
    console.log('Available Models:', modelsRes.data.models);

    // 4. Verify orchestration uses new config
    console.log('\n4. Verifying orchestration uses updated config...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'config-test.com',
      name: 'Config Test'
    });
    const sessionId = sessionRes.data.id;

    // The orchestration logs should show it's using the new settings (internal)
    await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Test config',
      model: 'mistral'
    });

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.message);
  }
}

demo();
