import { useState, useEffect } from 'react';
import { configApi } from '../../api';
import type { AppConfig } from '@ai-pentest/contracts';

export function GeneralSettings() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configApi.get().then(data => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const handleUpdate = async (updates: any) => {
    if (!config) return;
    try {
      const newConfig = await configApi.update(updates);
      setConfig(newConfig);
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  if (loading || !config) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">General Settings</h1>
        <p className="text-zinc-400">Configure global application behavior and connectivity.</p>
      </div>

      <section className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Ollama API URL</label>
            <input 
              type="text" 
              value={config.ollamaUrl} 
              onChange={(e) => handleUpdate({ ollamaUrl: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-3 pt-8">
            <input 
              type="checkbox" 
              id="useMock"
              checked={config.useMock}
              onChange={(e) => handleUpdate({ useMock: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="useMock" className="text-sm text-zinc-300">Use Mock Model Provider (Development)</label>
          </div>
        </div>

        <hr className="border-zinc-800" />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Model Default Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Temperature ({config.model.temperature})</label>
              <input 
                type="range" min="0" max="1" step="0.1"
                value={config.model.temperature} 
                onChange={(e) => handleUpdate({ model: { temperature: parseFloat(e.target.value) } })}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Context Length ({config.model.contextLength})</label>
              <select 
                value={config.model.contextLength}
                onChange={(e) => handleUpdate({ model: { contextLength: parseInt(e.target.value) } })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="2048">2048</option>
                <option value="4096">4096</option>
                <option value="8192">8192</option>
                <option value="16384">16384</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-4 md:pt-8">
              <input 
                type="checkbox" 
                id="multiAgentMode"
                checked={config.orchestration.multiAgentMode}
                onChange={(e) => handleUpdate({ orchestration: { multiAgentMode: e.target.checked } })}
                className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="multiAgentMode" className="text-sm text-zinc-300">Enable Multi-Agent Review Mode</label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
