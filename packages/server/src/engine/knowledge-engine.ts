import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { 
  KnowledgePack, 
  KnowledgeEntry, 
  KnowledgeSearchResult, 
  Schemas,
  ModelProvider
} from '@ai-pentest/contracts';
import { SimpleVectorStore } from './vector-store';

const ajv = new Ajv();
const validatePack = ajv.compile(Schemas.KnowledgePack);

export class KnowledgeBaseEngine {
  private packs: Map<string, KnowledgePack> = new Map();
  private registryPath: string;
  private vectorStore: SimpleVectorStore<KnowledgeEntry & { packId: string }>;
  private modelProvider: ModelProvider;

  constructor(registryPath: string, storageDir: string, modelProvider: ModelProvider) {
    this.registryPath = registryPath;
    this.modelProvider = modelProvider;
    this.vectorStore = new SimpleVectorStore(storageDir, 'kb-vectors');
  }

  public setProvider(provider: ModelProvider) {
      this.modelProvider = provider;
  }

  public async load(): Promise<void> {
    this.packs.clear();
    // In a real app, we might want to re-index only changed packs
    this.vectorStore.clear();

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
            
            // Generate embeddings for all entries in the pack
            console.log(`Indexing knowledge pack: ${kbPack.metadata.id}`);
            for (const entry of kbPack.entries) {
                const textToIndex = `${entry.title}\n${entry.content}\nTags: ${entry.tags.join(', ')}`;
                try {
                    if (this.modelProvider.getEmbeddings) {
                        const vector = await this.modelProvider.getEmbeddings(textToIndex);
                        this.vectorStore.upsert(
                            `${kbPack.metadata.id}:${entry.id}`, 
                            vector, 
                            { ...entry, packId: kbPack.metadata.id }
                        );
                    }
                } catch (err) {
                    console.error(`Failed to index entry ${entry.id} in pack ${kbPack.metadata.id}:`, err);
                }
            }
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

  public async search(query: string, limit: number = 5): Promise<KnowledgeSearchResult[]> {
    if (!this.modelProvider.getEmbeddings) {
        return this.keywordSearch(query, limit);
    }

    try {
        const queryVector = await this.modelProvider.getEmbeddings(query);
        const vectorResults = this.vectorStore.query(queryVector, limit);
        
        return vectorResults.map(r => ({
            entry: r.metadata,
            packId: r.metadata.packId,
            score: r.score
        }));
    } catch (err) {
        console.error('Semantic search failed, falling back to keyword search:', err);
        return this.keywordSearch(query, limit);
    }
  }

  private keywordSearch(query: string, limit: number = 5): KnowledgeSearchResult[] {
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
}
