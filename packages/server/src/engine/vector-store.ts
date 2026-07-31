import fs from 'fs';
import path from 'path';

export interface VectorEntry<T = any> {
  id: string;
  vector: number[];
  metadata: T;
}

export class SimpleVectorStore<T = any> {
  private entries: VectorEntry<T>[] = [];
  private storagePath: string;

  constructor(storageDir: string, name: string) {
    this.storagePath = path.join(storageDir, `${name}.vectors.json`);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.load();
  }

  private load() {
    if (fs.existsSync(this.storagePath)) {
      try {
        const content = fs.readFileSync(this.storagePath, 'utf-8');
        this.entries = JSON.parse(content);
      } catch (err) {
        console.error('Failed to load vector store:', err);
        this.entries = [];
      }
    }
  }

  private save() {
    fs.writeFileSync(this.storagePath, JSON.stringify(this.entries), 'utf-8');
  }

  public upsert(id: string, vector: number[], metadata: T) {
    const index = this.entries.findIndex(e => e.id === id);
    if (index >= 0) {
      this.entries[index] = { id, vector, metadata };
    } else {
      this.entries.push({ id, vector, metadata });
    }
    this.save();
  }

  public query(queryVector: number[], limit: number = 5): { metadata: T, score: number }[] {
    const results = this.entries.map(entry => ({
      metadata: entry.metadata,
      score: this.cosineSimilarity(queryVector, entry.vector)
    }));

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public clear() {
    this.entries = [];
    this.save();
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
