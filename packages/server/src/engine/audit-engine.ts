import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AuditEntry, AuditLog } from '@ai-pentest/contracts';

export class AuditEngine {
  private logPath: string;
  private currentHash: string = '0'.repeat(64);

  constructor(logDir: string) {
    this.logPath = path.join(logDir, 'audit.log');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.initialize();
  }

  private initialize() {
    if (fs.existsSync(this.logPath)) {
      const lines = fs.readFileSync(this.logPath, 'utf-8').trim().split('\n');
      if (lines.length > 0) {
        try {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          this.currentHash = lastEntry.hash;
        } catch (e) {
          console.error('Failed to parse last audit log entry, starting new chain.');
        }
      }
    }
  }

  public async log(sessionId: string, type: AuditEntry['type'], data: any): Promise<AuditEntry> {
    const timestamp = new Date();
    const id = crypto.randomUUID();
    
    const payload = JSON.stringify({
      id,
      sessionId,
      timestamp,
      type,
      data,
      previousHash: this.currentHash
    });

    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    const entry: AuditEntry = {
      id,
      sessionId,
      timestamp,
      type,
      data,
      previousHash: this.currentHash,
      hash
    };

    this.currentHash = hash;
    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf-8');
    
    return entry;
  }

  public verifyChain(): boolean {
    if (!fs.existsSync(this.logPath)) return true;

    const lines = fs.readFileSync(this.logPath, 'utf-8').trim().split('\n');
    let prevHash = '0'.repeat(64);

    for (const line of lines) {
      if (!line) continue;
      const entry = JSON.parse(line) as AuditEntry;
      
      const payload = JSON.stringify({
        id: entry.id,
        sessionId: entry.sessionId,
        timestamp: entry.timestamp,
        type: entry.type,
        data: entry.data,
        previousHash: entry.previousHash
      });

      const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
      
      if (calculatedHash !== entry.hash || entry.previousHash !== prevHash) {
        return false;
      }
      prevHash = entry.hash;
    }

    return true;
  }

  public getLogBySession(sessionId: string): AuditEntry[] {
    if (!fs.existsSync(this.logPath)) return [];
    const lines = fs.readFileSync(this.logPath, 'utf-8').trim().split('\n');
    return lines
      .map(line => JSON.parse(line))
      .filter((entry: AuditEntry) => entry.sessionId === sessionId);
  }
}
