import { useState, useEffect } from 'react';
import { api } from '../../api';
import { 
  BarChart3, 
  Activity, 
  Coins, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { clsx } from 'clsx';

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const res = await api.get('/telemetry');
      setMetrics(res.data);
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div className="text-zinc-500 animate-pulse">Initializing Telemetry...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold mb-2">Performance & Analytics</h1>
        <p className="text-zinc-400">Real-time observability into the Copilot engines.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Activity size={20} /></div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Requests</span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.requestCount}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Total model interactions</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400"><Coins size={20} /></div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Tokens</span>
            </div>
            <div className="text-2xl font-bold text-white">{(metrics.totalTokens / 1000).toFixed(1)}k</div>
            <div className="text-[10px] text-zinc-500 mt-1">{metrics.promptTokens} in / {metrics.completionTokens} out</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><Clock size={20} /></div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Latency</span>
            </div>
            <div className="text-2xl font-bold text-white">{Math.round(metrics.averageLatencies.orchestration || 0)}ms</div>
            <div className="text-[10px] text-zinc-500 mt-1">Avg orchestration turnaround</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><AlertTriangle size={20} /></div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Rule Hits</span>
            </div>
            <div className="text-2xl font-bold text-white">
                {Object.values(metrics.ruleTriggers).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Safety & Validation triggers</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency per Engine */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-6 flex items-center gap-2">
            <BarChart3 size={16} /> Engine Latency Distribution
          </h3>
          <div className="space-y-6">
            {Object.entries(metrics.averageLatencies).map(([engine, avg]: [string, any]) => (
              <div key={engine}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="capitalize text-zinc-300 font-medium">{engine} Engine</span>
                  <span className="text-zinc-500 font-mono">{Math.round(avg)}ms</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min((avg / 2000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Confidence Trends */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-6 flex items-center gap-2">
            <Activity size={16} /> Confidence Trend (Last 10 turns)
          </h3>
          <div className="h-40 flex items-end gap-1 px-2">
            {metrics.confidenceHistory.slice(-10).map((c: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                <div 
                    className={clsx(
                        "w-full rounded-t-sm transition-all duration-300",
                        c.score > 0.7 ? "bg-green-500/40" : c.score > 0.4 ? "bg-yellow-500/40" : "bg-red-500/40"
                    )}
                    style={{ height: `${c.score * 100}%` }}
                >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-700 whitespace-nowrap z-10">
                        {Math.round(c.score * 100)}%
                    </div>
                </div>
                <div className="w-full h-0.5 bg-zinc-800 rounded-full" />
              </div>
            ))}
            {metrics.confidenceHistory.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 italic text-xs">
                    No session data yet
                </div>
            )}
          </div>
        </section>
      </div>

      {/* Safety Rule Breakdown */}
      <section className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <ShieldCheck size={16} /> Security Interceptions
            </h3>
        </div>
        <div className="divide-y border-zinc-800">
            {Object.entries(metrics.ruleTriggers).length > 0 ? Object.entries(metrics.ruleTriggers).map(([rule, count]: [string, any]) => (
                <div key={rule} className="p-4 flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="font-medium text-zinc-300">{rule}</span>
                    </div>
                    <span className="font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{count} hits</span>
                </div>
            )) : (
                <div className="p-8 text-center text-zinc-600 italic text-xs">
                    No safety violations recorded
                </div>
            )}
        </div>
      </section>
    </div>
  );
}

import { ShieldCheck } from 'lucide-react';
