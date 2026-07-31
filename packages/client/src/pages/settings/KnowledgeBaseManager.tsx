import { useState, useEffect } from 'react';
import { knowledgeApi } from '../../api';
import type { KnowledgePack } from '@ai-pentest/contracts';
import { Book, User, Calendar, Tag } from 'lucide-react';

export function KnowledgeBaseManager() {
  const [packs, setPacks] = useState<KnowledgePack[]>([]);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    const data = await knowledgeApi.listPacks();
    setPacks(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Knowledge Base</h1>
        <p className="text-zinc-400">Pluggable store of methodologies, tool references, and vulnerability data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packs.map(pack => (
          <div key={pack.metadata.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Book size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1 bg-zinc-900 rounded border border-zinc-800">
                        {pack.entries.length} Entries
                    </span>
                </div>
                <h3 className="text-lg font-bold mb-1">{pack.metadata.name}</h3>
                <p className="text-sm text-zinc-400 mb-4">{pack.metadata.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {pack.metadata.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded flex items-center gap-1 border border-zinc-800">
                            <Tag size={8} /> {tag}
                        </span>
                    ))}
                </div>
            </div>
            <div className="px-5 py-3 bg-zinc-900/50 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                    <User size={12} /> {pack.metadata.author}
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} /> v{pack.metadata.version}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
