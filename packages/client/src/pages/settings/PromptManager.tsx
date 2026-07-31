import { useState, useEffect } from 'react';
import { promptsApi } from '../../api';
import type { PromptModule } from '@ai-pentest/contracts';
import { RefreshCw, FileCode, Tag } from 'lucide-react';

export function PromptManager() {
  const [prompts, setPrompts] = useState<PromptModule[]>([]);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const data = await promptsApi.list();
    setPrompts(data);
  };

  const handleReload = async () => {
    await promptsApi.reload();
    loadPrompts();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">Prompt Manager</h1>
          <p className="text-zinc-400">View and manage adaptive prompt modules.</p>
        </div>
        <button 
          onClick={handleReload}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} /> Reload Registry
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {prompts.map(prompt => (
          <div key={`${prompt.id}-${prompt.version}`} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 hover:border-blue-500/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <FileCode size={20} />
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {prompt.name} 
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-mono">v{prompt.version}</span>
                  </h3>
                  <p className="text-xs text-zinc-500">{prompt.id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                  {prompt.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-zinc-900 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Tag size={8} /> {tag}
                      </span>
                  ))}
              </div>
            </div>
            
            <p className="text-sm text-zinc-300 mb-4">{prompt.description}</p>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Template Preview</h4>
                <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {prompt.template.substring(0, 300)}{prompt.template.length > 300 ? '...' : ''}
                </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
