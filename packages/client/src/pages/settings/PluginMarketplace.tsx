import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { PluginManifest } from '@ai-pentest/contracts';
import { 
  Boxes, 
  Puzzle, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw,
  MoreVertical,
  Activity
} from 'lucide-react';
import { clsx } from 'clsx';

export function PluginMarketplace() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plugins');
      setPlugins(res.data);
    } catch (err) {
      console.error('Failed to load plugins', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    await api.post('/plugins/reload');
    loadPlugins();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-white flex items-center gap-3">
            <Boxes className="text-blue-500" /> Plugin Marketplace
          </h1>
          <p className="text-zinc-400">Extend the Copilot with custom engines, methodologies, and technical modules.</p>
        </div>
        <button 
          onClick={handleReload}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm transition-colors text-zinc-300"
        >
          <RefreshCw size={16} /> Scan Local Plugins
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
                <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl h-48 animate-pulse" />
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map(plugin => (
            <div key={plugin.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col group hover:border-blue-500/50 transition-all">
                <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className={clsx(
                            "p-2.5 rounded-xl border",
                            plugin.type === 'recon' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            plugin.type === 'exploitation' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            "bg-zinc-800 text-zinc-400 border-zinc-700"
                        )}>
                            <Puzzle size={24} />
                        </div>
                        <div className="flex gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase tracking-tight">
                                v{plugin.version}
                            </span>
                            <button className="p-1 text-zinc-600 hover:text-zinc-400">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>
                    <h3 className="font-bold text-gray-100 mb-1">{plugin.name}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {plugin.description}
                    </p>
                </div>
                
                <div className="px-5 py-4 border-t border-zinc-900 flex flex-col gap-3 bg-zinc-950/50">
                    <div className="flex flex-wrap gap-1.5">
                        {plugin.capabilities.slice(0, 3).map(cap => (
                            <span key={cap} className="text-[9px] bg-blue-500/5 text-blue-500/70 border border-blue-500/10 px-1.5 py-0.5 rounded">
                                {cap}
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <ShieldCheck size={14} className="text-green-500/50" />
                            <span className="text-[10px] uppercase font-bold tracking-tighter">Verified Provider</span>
                        </div>
                        <button className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1">
                            Configure <ExternalLink size={12} />
                        </button>
                    </div>
                </div>
            </div>
          ))}
          
          {/* Marketplace Empty State / Coming Soon */}
          <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center gap-4 group hover:border-zinc-700 transition-colors">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  <Activity size={24} />
              </div>
              <div>
                  <h4 className="text-sm font-bold text-zinc-400">Community Hub</h4>
                  <p className="text-xs text-zinc-600 mt-1">Browse and install 100+ verified pentest modules.</p>
              </div>
              <button className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-zinc-800 px-3 py-1.5 rounded hover:bg-zinc-700 transition-colors">
                  Coming in Phase 25
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
