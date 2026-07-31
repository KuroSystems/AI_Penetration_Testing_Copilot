import { useState, useEffect } from 'react';
import { rulesApi } from '../../api';
import type { SafetyRule } from '@ai-pentest/contracts';
import { ShieldCheck, RefreshCw, AlertTriangle, Fingerprint } from 'lucide-react';
import { clsx } from 'clsx';

export function SafetyRulesManager() {
  const [rules, setRules] = useState<SafetyRule[]>([]);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const data = await rulesApi.list();
    setRules(data);
  };

  const handleReload = async () => {
    await rulesApi.reload();
    loadRules();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">Safety & Scope Guard</h1>
          <p className="text-zinc-400">Declarative rules that intercept and block high-risk AI actions.</p>
        </div>
        <button 
          onClick={handleReload}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} /> Reload Rules
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map(rule => (
          <div key={rule.id} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                      "p-2 rounded-lg border",
                      rule.severity === 'high' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                      rule.severity === 'medium' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : 
                      "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  )}>
                      <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      {rule.name}
                      <span className={clsx(
                          "text-[9px] uppercase font-black px-1.5 py-0.5 rounded",
                          rule.action === 'block' ? "bg-red-600 text-white" :
                          rule.action === 'flag' ? "bg-yellow-600 text-black" : "bg-zinc-700 text-zinc-300"
                      )}>
                          {rule.action}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">{rule.id}</p>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 capitalize">
                    {rule.severity} Severity
                </div>
              </div>
              
              <p className="text-sm text-zinc-300 mb-4">{rule.description}</p>
              
              <div className="space-y-3">
                  {rule.pattern && (
                      <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                          <Fingerprint size={14} className="text-zinc-500" />
                          <code className="text-xs text-blue-400 font-mono flex-1 truncate">{rule.pattern}</code>
                          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Regex Pattern</span>
                      </div>
                  )}
                  <div className="flex items-start gap-3 bg-red-950/10 p-3 rounded-lg border border-red-900/20">
                      <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-200 italic">"{rule.message}"</p>
                  </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
