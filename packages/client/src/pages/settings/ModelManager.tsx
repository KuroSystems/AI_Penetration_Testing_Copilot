import { useState, useEffect } from 'react';
import { modelsApi, configApi } from '../../api';
import { Download, Check, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export function ModelManager() {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    loadModels();
    configApi.get().then(cfg => setCurrentModel(cfg.model.modelName));
  }, []);

  const loadModels = async () => {
    const data = await modelsApi.listAvailable();
    setAvailableModels(data.models);
  };

  const handleSwitchModel = async (name: string) => {
    await configApi.update({ model: { modelName: name } });
    setCurrentModel(name);
  };

  const handlePull = async () => {
    if (!newModelName) return;
    setPulling(true);
    try {
      await modelsApi.pull(newModelName);
      alert('Model pull initiated. Check Ollama logs for progress.');
      setNewModelName('');
    } catch (err) {
      alert('Failed to pull model');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Model Manager</h1>
        <p className="text-zinc-400">Manage and switch between available LLMs.</p>
      </div>

      <section className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <h3 className="font-medium text-sm text-zinc-300 uppercase tracking-wider">Installed Models</h3>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="model:tag"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none"
                />
                <button 
                    onClick={handlePull}
                    disabled={pulling}
                    className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded-lg text-white disabled:bg-zinc-800 transition-colors"
                >
                    {pulling ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                </button>
            </div>
        </div>
        <div className="divide-y border-zinc-800">
          {availableModels.map(model => (
            <div key={model} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400">
                  AI
                </div>
                <span className="font-medium">{model}</span>
              </div>
              <button 
                onClick={() => handleSwitchModel(model)}
                className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    currentModel === model 
                        ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                {currentModel === model ? <span className="flex items-center gap-1"><Check size={12} /> Active</span> : 'Switch'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
