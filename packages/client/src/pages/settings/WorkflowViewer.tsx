import React, { useState, useEffect } from 'react';
import { workflowApi } from '../../api';
import type { StageGraph } from '@ai-pentest/contracts';
import { GitBranch } from 'lucide-react';

export function WorkflowViewer() {
  const [workflows, setWorkflows] = useState<StageGraph[]>([]);

  useEffect(() => {
    workflowApi.list().then(data => {
      setWorkflows(data);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Workflow Methodologies</h1>
        <p className="text-zinc-400">Track and define the lifecycle stages of technical engagements.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {workflows.map(wf => (
          <div key={wf.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <GitBranch size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold">{wf.name}</h3>
                <p className="text-sm text-zinc-500">ID: {wf.id} | v{wf.version}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Lifecycle Graph</h4>
              <div className="flex flex-wrap items-center gap-3">
                {Object.values(wf.stages).map((stage, idx) => (
                  <React.Fragment key={stage.id}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 min-w-[140px]">
                      <span className="text-[10px] font-bold text-zinc-500 block uppercase mb-1">Stage {idx + 1}</span>
                      <span className="text-sm font-medium">{stage.name}</span>
                    </div>
                    {idx < Object.values(wf.stages).length - 1 && (
                      <span className="text-zinc-700">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
