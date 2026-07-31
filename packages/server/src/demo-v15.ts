import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 15 Demo: Knowledge Base Engine (RAG-Ready) ---');
  
  try {
    // 1. List packs
    console.log('1. Listing Knowledge Packs...');
    const packsRes = await axios.get(`${baseUrl}/knowledge/packs`);
    console.log(`Found ${packsRes.data.length} pack(s).`);
    packsRes.data.forEach((p: any) => console.log(` - ${p.metadata.name} (ID: ${p.metadata.id})`));

    // 2. Search knowledge
    console.log('\n2. Searching knowledge for "web cache"...');
    const searchRes = await axios.get(`${baseUrl}/knowledge/search?q=web+cache`);
    console.log(`Found ${searchRes.data.length} result(s).`);
    searchRes.data.forEach((r: any) => {
        console.log(` - [Score: ${r.score.toFixed(2)}] ${r.entry.title}: ${r.entry.content.substring(0, 50)}...`);
    });

    // 3. Orchestration integration (RAG)
    console.log('\n3. Processing prompt to trigger KB context injection...');
    const sessionRes = await axios.post(`${baseUrl}/sessions`, {
      target: 'test-site.com',
      name: 'RAG Test'
    });
    const sessionId = sessionRes.data.id;

    const genRes = await axios.post(`${baseUrl}/generate`, {
      sessionId,
      prompt: 'Tell me about web cache deception.',
      model: 'mock-llama3'
    });
    
    console.log('Recommended Action:', genRes.data.recommendedAction);

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.message);
  }
}

demo();
