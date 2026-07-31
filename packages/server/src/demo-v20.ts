import axios from 'axios';

async function demo() {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  console.log('--- Phase 20 Demo: Plugin System ---');
  
  try {
    // 1. List loaded plugins
    console.log('1. Listing loaded plugins from registry...');
    const pluginsRes = await axios.get(`${baseUrl}/plugins`);
    console.log(`Found ${pluginsRes.data.length} plugin(s).`);
    pluginsRes.data.forEach((p: any) => {
        console.log(` - ${p.name} v${p.version} (ID: ${p.id})`);
        console.log(`   Type: ${p.type}, Capabilities: ${p.capabilities.join(', ')}`);
    });

    // 2. Mocking a check of the plugin execution
    // The server log during startup should show:
    // [Plugin: sample-recon-enhancer] Recon Enhancer plugin initialized successfully!

    console.log('\n--- Demo Completed Successfully ---');
  } catch (error: any) {
    console.error('Demo failed:', error.message);
  }
}

demo();
