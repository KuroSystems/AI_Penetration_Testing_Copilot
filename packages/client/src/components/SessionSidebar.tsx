import type { Session } from '@ai-pentest/contracts';
import { Plus, Terminal, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  sessions: Session[];
  activeSession: Session | null;
  onSelect: (s: Session) => void;
  onNew: () => void;
}

export function SessionSidebar({ sessions, activeSession, onSelect, onNew }: SidebarProps) {
  return (
    <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-950">
      <div className="p-4 flex flex-col gap-4">
        <button 
          onClick={onNew}
          className="flex items-center gap-2 justify-center w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors font-medium text-sm"
        >
          <Plus size={16} /> New Engagement
        </button>

        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
                type="text" 
                placeholder="Search sessions..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500/50"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 text-left">
        <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">History</h3>
        <div className="flex flex-col gap-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative text-left",
                activeSession?.id === s.id 
                  ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              <Terminal size={14} className={activeSession?.id === s.id ? "text-blue-500" : "text-zinc-500 group-hover:text-zinc-300"} />
              <div className="flex-1 truncate text-left">
                <div className="truncate">{s.name}</div>
                <div className="text-[10px] text-zinc-500 truncate">{s.target}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
