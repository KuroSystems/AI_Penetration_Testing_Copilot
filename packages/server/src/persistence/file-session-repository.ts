import fs from 'fs';
import path from 'path';
import { Session, SessionRepository, SessionStatus } from '@ai-pentest/contracts';

export class FileSessionRepository implements SessionRepository {
  private storageDir: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.storageDir, `${id}.json`);
  }

  async getById(id: string): Promise<Session | null> {
    const filePath = this.getFilePath(id);
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const session = JSON.parse(content);
      // Migration check (Phase 3 basic)
      return this.migrate(session);
    } catch (error) {
      console.error(`Error reading session ${id}:`, error);
      return null;
    }
  }

  async list(): Promise<Session[]> {
    const files = fs.readdirSync(this.storageDir);
    const sessions: Session[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const id = path.basename(file, '.json');
        const session = await this.getById(id);
        if (session) sessions.push(session);
      }
    }
    return sessions;
  }

  async create(data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date();
    const session: Session = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    await this.save(session);
    return session;
  }

  async update(id: string, updates: Partial<Session>): Promise<Session> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Session ${id} not found`);

    const updated: Session = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    await this.save(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const filePath = this.getFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private async save(session: Session): Promise<void> {
    const filePath = this.getFilePath(session.id);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }

  private migrate(session: any): Session {
    // Current version is 1. Add future migration logic here.
    if (!session.version) {
        session.version = 1;
    }
    return session as Session;
  }
}
