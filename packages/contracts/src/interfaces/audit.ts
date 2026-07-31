export interface AuditEntry {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: 'decision' | 'action' | 'rule_trigger' | 'state_change' | 'checkpoint';
  data: any;
  previousHash: string;
  hash: string;
}

export interface AuditLog {
  entries: AuditEntry[];
  lastHash: string;
}

export interface Checkpoint {
  id: string;
  sessionId: string;
  timestamp: Date;
  state: any; // SessionState
}
