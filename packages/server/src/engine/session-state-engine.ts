import { Session, SessionRepository, SessionStatus, SessionState } from '@ai-pentest/contracts';

export class SessionStateEngine {
  private repository: SessionRepository;

  constructor(repository: SessionRepository) {
    this.repository = repository;
  }

  async createSession(target: string, name?: string, workflowId: string = 'standard-pentest'): Promise<Session> {
    const initialState: SessionState = {
      currentPhase: 'scoping',
      stageHistory: [{ stage: 'scoping', enteredAt: new Date() }],
      knownFacts: [],
      pinnedFacts: [],
      openQuestions: ['What are the objectives?'],
      actionHistory: [],
      chatHistory: [],
      confidenceSnapshot: 0.1
    };

    return this.repository.create({
      name: name || `Session ${new Date().toISOString()}`,
      target,
      status: SessionStatus.ACTIVE,
      metadata: { workflowId },
      state: initialState,
      version: 1
    });
  }

  async transitionStage(id: string, nextStage: string, validator: (from: string, to: string) => boolean): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const currentStage = session.state.currentPhase;
    if (!validator(currentStage, nextStage)) {
      throw new Error(`Invalid stage transition from ${currentStage} to ${nextStage}`);
    }

    if (currentStage === nextStage) return session;

    const stageHistory = [
      ...session.state.stageHistory,
      { stage: nextStage, enteredAt: new Date() }
    ];

    return this.repository.update(id, {
      state: { 
        ...session.state, 
        currentPhase: nextStage,
        stageHistory 
      }
    });
  }

  async addChatMessage(id: string, role: 'user' | 'assistant' | 'system', content: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const chatHistory = [
      ...session.state.chatHistory,
      { role, content, timestamp: new Date() }
    ];

    return this.repository.update(id, {
      state: { ...session.state, chatHistory }
    });
  }

  async pinFact(id: string, fact: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    const pinnedFacts = [...new Set([...(session.state.pinnedFacts || []), fact])];
    return this.repository.update(id, { 
      state: { ...session.state, pinnedFacts } 
    });
  }

  async setSummary(id: string, summary: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    return this.repository.update(id, { 
      state: { ...session.state, summary } 
    });
  }

  async getSession(id: string): Promise<Session | null> {
    return this.repository.getById(id);
  }

  async listSessions(): Promise<Session[]> {
    return this.repository.list();
  }

  async updateState(id: string, stateUpdate: Partial<SessionState>): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const newState: SessionState = {
      ...session.state,
      ...stateUpdate,
      actionHistory: [...session.state.actionHistory, ...(stateUpdate.actionHistory || [])]
    };

    return this.repository.update(id, { state: newState });
  }

  async addFact(id: string, fact: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    const knownFacts = [...new Set([...session.state.knownFacts, fact])];
    return this.repository.update(id, { 
      state: { ...session.state, knownFacts } 
    });
  }

  async recordAction(id: string, action: string, result: any): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const actionHistory = [
      ...session.state.actionHistory,
      { action, result, timestamp: new Date() }
    ];

    return this.repository.update(id, {
      state: { ...session.state, actionHistory }
    });
  }

  async setPhase(id: string, phase: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    return this.repository.update(id, {
      state: { ...session.state, currentPhase: phase }
    });
  }

  async completeSession(id: string): Promise<Session> {
    return this.repository.update(id, {
      status: SessionStatus.COMPLETED,
      endTime: new Date()
    });
  }
}
