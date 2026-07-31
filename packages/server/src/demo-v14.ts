import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 14 Demo: Checkpoint & Audit Log ---');
  
  try {
    // 1. Create a session
    console.log('1. Creating a session...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'audit-test.com',
      name: 'Audit Engine Test'
    });
    const sessionId = sessionRes.data.id;

    // 2. Perform some actions
    console.log('\n2. Performing several actions to trigger audit logs...');
    await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Who are you?',
      model: 'mock-llama3'
    });

    await axios.post(`${baseUrl}/sessions/${sessionId}/facts`, {
      fact: 'System is running Linux'
    });

    // 3. Fetch Audit Log
    console.log('\n3. Fetching audit log for the session...');
    const auditRes = await axios.get(`${baseUrl}/sessions/${sessionId}/audit`);
    console.log(`Found ${auditRes.data.length} audit entries.`);
    
    auditRes.data.forEach((entry: any) => {
        console.log(` - [${entry.timestamp}] ${entry.type}: ${entry.hash.substring(0, 8)}...`);
    });

    // 4. Verify Integrity
    console.log('\n4. Verifying audit log integrity (hash chain)...');
    const verifyRes = await axios.get(`${baseUrl}/audit/verify`);
    console.log('Integrity Valid:', verifyRes.data.valid);

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.message);
  }
}

demo();
