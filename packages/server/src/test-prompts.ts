import path from 'path';
import { PromptRegistry } from './registry/prompt-registry';
import { PromptLoader } from './registry/prompt-loader';

async function test() {
  console.log('--- Phase 2 Test: Prompt Module System ---');
  
  const registryPath = path.join(__dirname, 'registry', 'prompts');
  const registry = new PromptRegistry(registryPath);
  const loader = new PromptLoader(registry);

  console.log('1. Loading registry...');
  await registry.load();

  console.log('\n2. Listing all loaded modules (should not include invalid.json):');
  const all = registry.listAll();
  all.forEach(m => console.log(` - ${m.id} v${m.version} [${m.tags.join(', ')}]`));

  console.log('\n3. Testing Prompt Assembly (tags: ["core"]):');
  const assembled = loader.assemble(['core'], { date: '2026-07-30' });
  console.log('Assembled Prompt:\n' + assembled);

  console.log('\n4. Testing Versioning (getting latest system-identity):');
  const latest = registry.getModule('system-identity');
  console.log(`Latest: ${latest?.version}`);
  
  console.log('\n5. Testing Rollback/Specific Version (getting v1.0.0):');
  const old = registry.getModule('system-identity', '1.0.0');
  console.log(`Old Version Found: ${old?.name} v${old?.version}`);

  console.log('\n--- Test Completed ---');
}

test();
