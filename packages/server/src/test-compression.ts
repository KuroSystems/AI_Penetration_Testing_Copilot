import { TokenBudgetCompressionEngine } from './engine/compression-engine';
import { Session, SessionStatus } from '@ai-pentest/contracts';

async function test() {
  console.log('--- Phase 4 Test: Context Compression Engine ---');

  const engine = new TokenBudgetCompressionEngine();

  const mockSession: Session = {
    id: 'test-session',
    name: 'Long Session Test',
    target: 'example.com',
    status: SessionStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    metadata: {},
    state: {
      currentPhase: 'exploitation',
      stageHistory: [{ stage: 'exploitation', enteredAt: new Date() }],
      knownFacts: ['Fact 1: SSH is open', 'Fact 2: Found weak credentials'],
      pinnedFacts: ['CRITICAL: Root access obtained on 10.0.0.5'],
      openQuestions: [],
      actionHistory: [],
      chatHistory: [],
      summary: 'Previously explored the network and identified multiple vulnerabilities.',
      confidenceSnapshot: 0.8
    }
  };

  // Add 100 messages to chat history
  for (let i = 1; i <= 100; i++) {
    mockSession.state.chatHistory.push({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `This is message number ${i}. It contains some content that takes up tokens. Message ${i} is quite repetitive but necessary for the test.`,
      timestamp: new Date()
    });
  }

  const config = {
    maxTokens: 500, // Small budget to force compression
    reserveForResponse: 100,
    shortTermHistoryLimit: 20
  };

  console.log(`1. Compressing session with ${mockSession.state.chatHistory.length} messages...`);
  console.log(`Budget: ${config.maxTokens} tokens, Reserved: ${config.reserveForResponse} tokens`);
  
  const context = await engine.compress(mockSession, config);

  console.log('\n2. Results:');
  console.log(`- Token Estimate: ${context.tokenEstimate}`);
  console.log(`- Messages Included: ${context.messages.length}`);
  console.log(`- System Prompt Length: ${context.systemPrompt.length} chars`);
  
  console.log('\n3. Verifying Critical Info Retention:');
  const includesPinned = context.systemPrompt.includes('CRITICAL: Root access obtained on 10.0.0.5');
  const includesPhase = context.systemPrompt.includes('Current Phase: exploitation');
  
  console.log(`- Includes Pinned Fact: ${includesPinned}`);
  console.log(`- Includes Phase Info: ${includesPhase}`);

  if (context.tokenEstimate > (config.maxTokens - config.reserveForResponse)) {
    console.error('FAILED: Token estimate exceeds budget!');
  } else if (!includesPinned || !includesPhase) {
    console.error('FAILED: Critical information lost during compression!');
  } else {
    console.log('\nSUCCESS: Context is within budget and retains critical information.');
  }

  console.log('\n--- Test Completed ---');
}

test();
