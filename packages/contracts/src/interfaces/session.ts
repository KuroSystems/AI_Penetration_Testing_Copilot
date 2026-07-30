export enum SessionStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
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
}

export interface SessionRepository {
  getById(id: string): Promise<Session | null>;
  list(): Promise<Session[]>;
  create(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session>;
  update(id: string, updates: Partial<Session>): Promise<Session>;
  delete(id: string): Promise<void>;
}
