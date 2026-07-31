export interface KnowledgePackMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: 'tool' | 'methodology' | 'reference' | 'vulnerability';
  tags: string[];
  metadata?: Record<string, any>;
}

export interface KnowledgePack {
  metadata: KnowledgePackMetadata;
  entries: KnowledgeEntry[];
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  packId: string;
  score: number;
}
