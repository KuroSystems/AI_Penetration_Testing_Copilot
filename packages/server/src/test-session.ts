import path from 'path';
import fs from 'fs';
import { FileSessionRepository } from './persistence/file-session-repository';
import { SessionStateEngine } from './engine/session-state-engine';

async function test() {
  console.log('--- Phase 3 Test: Session State Engine & Persistence ---');
  
  const storageDir = path.join(__dirname, 'persistence', 'sessions-test');
  if (fs.existsSync(storageDir)) {
      fs.rmSync(storageDir, { recursive: true });
  }
  
  const repo = new FileSessionRepository(storageDir);
  const engine = new SessionStateEngine(repo);

  console.log('1. Creating a new session...');
  const session = await engine.createSession('example.com', 'Test Session');
  console.log(`Created Session ID: ${session.id}, Phase: ${session.state.currentPhase}`);

  console.log('\n2. Adding a fact and recording an action...');
  await engine.addFact(session.id, 'Port 80 is open');
  await engine.recordAction(session.id, 'nmap scan', { result: 'open ports: 80, 443' });
  
  let updated = await engine.getSession(session.id);
  console.log('Updated Facts:', updated?.state.knownFacts);
  console.log('Action History Count:', updated?.state.actionHistory.length);

  console.log('\n3. Testing Persistence (Creating new engine instance on same dir)...');
  const repo2 = new FileSessionRepository(storageDir);
  const engine2 = new SessionStateEngine(repo2);
  const resumed = await engine2.getSession(session.id);
  
  if (resumed && resumed.state.knownFacts.includes('Port 80 is open')) {
      console.log('Successfully resumed session state from file!');
  } else {
      console.error('Failed to resume session state.');
  }

  console.log('\n4. Testing Phase Change...');
  await engine2.setPhase(session.id, 'exploitation');
  const final = await engine2.getSession(session.id);
  console.log(`Final Phase: ${final?.state.currentPhase}`);

  console.log('\n--- Test Completed ---');
}

test();
