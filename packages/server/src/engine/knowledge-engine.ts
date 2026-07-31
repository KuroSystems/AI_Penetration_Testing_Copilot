import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { 
  KnowledgePack, 
  KnowledgeEntry, 
  KnowledgeSearchResult, 
  Schemas 
} from '@ai-pentest/contracts';

const ajv = new Ajv();
const validatePack = ajv.compile(Schemas.KnowledgePack);

export class KnowledgeBaseEngine {
  private packs: Map<string, KnowledgePack> = new Map();
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  public async load(): Promise<void> {
    this.packs.clear();
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }

    const files = fs.readdirSync(this.registryPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.registryPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const pack = JSON.parse(content);
          
          if (validatePack(pack)) {
            const kbPack = pack as unknown as KnowledgePack;
            this.packs.set(kbPack.metadata.id, kbPack);
            console.log(`Loaded knowledge pack: ${kbPack.metadata.id} v${kbPack.metadata.version}`);
          } else {
            console.error(`Invalid knowledge pack ${file}:`, validatePack.errors);
          }
        } catch (error: any) {
          console.error(`Error loading knowledge pack ${file}: ${error.message}`);
        }
      }
    }
  }

  public search(query: string, limit: number = 5): KnowledgeSearchResult[] {
    const results: KnowledgeSearchResult[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const [packId, pack] of this.packs.entries()) {
      for (const entry of pack.entries) {
        let score = 0;
        const entryText = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();

        for (const term of queryTerms) {
          if (entryText.includes(term)) {
            score += 1;
          }
        }

        if (score > 0) {
          results.push({
            entry,
            packId,
            score: score / queryTerms.length
          });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public listPacks(): KnowledgePack[] {
    return Array.from(this.packs.values());
  }

  public getEntry(packId: string, entryId: string): KnowledgeEntry | null {
    const pack = this.packs.get(packId);
    if (!pack) return null;
    return pack.entries.find(e => e.id === entryId) || null;
  }
}
