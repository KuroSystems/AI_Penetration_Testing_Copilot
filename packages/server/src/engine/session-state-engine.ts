import { Session, SessionRepository, SessionStatus, SessionState, EventBus, MessageType } from '@ai-pentest/contracts';

export class SessionStateEngine {
  private repository: SessionRepository;
  private eventBus: EventBus;

  constructor(repository: SessionRepository, eventBus: EventBus) {
    this.repository = repository;
    this.eventBus = eventBus;
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

    const session = await this.repository.create({
      name: name || `Session ${new Date().toISOString()}`,
      target,
      status: SessionStatus.ACTIVE,
      metadata: { workflowId },
      state: initialState,
      version: 1
    });

    this.publishUpdate(session.id, session.state);
    return session;
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

    const updated = await this.repository.update(id, {
      state: { 
        ...session.state, 
        currentPhase: nextStage,
        stageHistory 
      }
    });

    this.publishUpdate(id, updated.state);
    return updated;
  }

  async addChatMessage(id: string, role: 'user' | 'assistant' | 'system', content: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const chatHistory = [
      ...session.state.chatHistory,
      { role, content, timestamp: new Date() }
    ];

    const updated = await this.repository.update(id, {
      state: { ...session.state, chatHistory }
    });

    this.publishUpdate(id, updated.state);
    return updated;
  }

  async pinFact(id: string, fact: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    const pinnedFacts = [...new Set([...(session.state.pinnedFacts || []), fact])];
    const updated = await this.repository.update(id, { 
      state: { ...session.state, pinnedFacts } 
    });

    this.publishUpdate(id, updated.state);
    return updated;
  }

  async setSummary(id: string, summary: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    const updated = await this.repository.update(id, { 
      state: { ...session.state, summary } 
    });

    this.publishUpdate(id, updated.state);
    return updated;
  }

  async getSession(id: string): Promise<Session | null> {
    return this.repository.getById(id);
  }

  async listSessions(): Promise<Session[]> {
    return this.repository.list();
  }

  async updateState(id: string, stateUpdate: Partial<SessionState>, skipPublish: boolean = false): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const newState: SessionState = {
      ...session.state,
      ...stateUpdate,
    };

    const updated = await this.repository.update(id, { state: newState });
    if (!skipPublish) {
        this.publishUpdate(id, updated.state);
    }
    return updated;
  }

  async addFact(id: string, fact: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    const knownFacts = [...new Set([...session.state.knownFacts, fact])];
    const updated = await this.repository.update(id, { 
      state: { ...session.state, knownFacts } 
    });

    this.publishUpdate(id, updated.state);
    return updated;
  }

  async recordAction(id: string, action: string, result: any): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const actionHistory = [
      ...session.state.actionHistory,
      { action, result, timestamp: new Date() }
    ];

    const updated = await this.repository.update(id, {
      state: { ...session.state, actionHistory }
    });

    this.publishUpdate(id, updated.state);
    return updated;
  }

  async setPhase(id: string, phase: string): Promise<Session> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const updated = await this.repository.update(id, {
      state: { ...session.state, currentPhase: phase }
    });

    this.publishUpdate(id, updated.state);
    return updated;
  }

  async completeSession(id: string): Promise<Session> {
    const updated = await this.repository.update(id, {
      status: SessionStatus.COMPLETED,
      endTime: new Date()
    });
    this.publishUpdate(id, updated.state);
    return updated;
  }

  async createCheckpoint(id: string): Promise<void> {
    const session = await this.repository.getById(id);
    if (!session) throw new Error(`Session ${id} not found`);
    console.log(`Creating explicit checkpoint for session ${id}`);
  }

  private publishUpdate(sessionId: string, state: SessionState) {
      this.eventBus.publish({
          id: Math.random().toString(36).substring(7),
          type: MessageType.EVENT,
          source: 'session-engine',
          topic: 'session.updated',
          payload: { sessionId, state },
          timestamp: new Date()
      });
  }
}
