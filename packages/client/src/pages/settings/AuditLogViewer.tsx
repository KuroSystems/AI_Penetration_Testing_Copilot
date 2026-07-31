import { useState, useEffect } from 'react';
import { api } from '../../api';
import { ShieldCheck, AlertCircle, Clock, Hash } from 'lucide-react';
import { clsx } from 'clsx';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    // For demo, list all sessions and get logs for the first one
    // In real app, we'd have a session selector
    api.get('/sessions').then(async res => {
      if (res.data.length > 0) {
        const audit = await api.get(`/sessions/${res.data[0].id}/audit`);
        setLogs(audit.data.reverse());
      }
    });

    api.get('/audit/verify').then(res => setIsVerified(res.data.valid));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">Audit Logs</h1>
          <p className="text-zinc-400">Append-only, cryptographically linked record of all actions.</p>
        </div>
        <div className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border",
            isVerified ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
        )}>
            {isVerified ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            {isVerified ? 'Chain Verified' : 'Integrity Failure'}
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-500 font-medium">
                      <tr>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Event Hash</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                      {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors group">
                              <td className="px-4 py-4 whitespace-nowrap text-zinc-400 font-mono text-xs">
                                  <div className="flex items-center gap-2">
                                      <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                                  </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={clsx(
                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                      log.type === 'decision' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                      log.type === 'action' && "bg-green-500/10 text-green-400 border-green-500/20",
                                      log.type === 'rule_trigger' && "bg-red-500/10 text-red-400 border-red-500/20",
                                      log.type === 'checkpoint' && "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  )}>
                                      {log.type}
                                  </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-zinc-500 font-mono text-[10px]">
                                  <div className="flex items-center gap-2">
                                      <Hash size={10} /> {log.hash.substring(0, 16)}...
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
