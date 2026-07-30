export enum SessionStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface SessionState {
  currentPhase: string;
  stageHistory: Array<{
    stage: string;
    enteredAt: Date;
  }>;
  knownFacts: string[];
  pinnedFacts: string[]; // Facts that should never be compressed
  openQuestions: string[];
  actionHistory: Array<{
    action: string;
    result: any;
    timestamp: Date;
  }>;
  chatHistory: ChatMessage[]; // Added for memory
  summary?: string; // Long-term memory summary
  confidenceSnapshot: number;
}

export interface Session {
  id: string;
  name: string;
  target: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  endTime?: Date;
  tags?: string[];
  config?: Record<string, any>;
  metadata: Record<string, any>;
  state: SessionState; // Added nested state
  version: number; // For migrations
}

export interface SessionRepository {
  getById(id: string): Promise<Session | null>;
  list(): Promise<Session[]>;
  create(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session>;
  update(id: string, updates: Partial<Session>): Promise<Session>;
  delete(id: string): Promise<void>;
}
