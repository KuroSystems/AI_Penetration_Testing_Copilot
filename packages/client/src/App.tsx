import { useState, useEffect } from 'react';
import { sessionsApi } from './api';
import type { Session } from '@ai-pentest/contracts';
import { SessionSidebar } from './components/SessionSidebar';
import { ChatWindow } from './components/ChatWindow';
import { Menu, Plus, Settings } from 'lucide-react';

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await sessionsApi.list();
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        setActiveSession(data[0]);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  const handleCreateSession = async () => {
    const target = prompt('Enter target (e.g. example.com):');
    if (!target) return;
    try {
      const newSession = await sessionsApi.create(target, `Engagement: ${target}`);
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession);
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      {isSidebarOpen && (
        <SessionSidebar 
          sessions={sessions} 
          activeSession={activeSession} 
          onSelect={setActiveSession}
          onNew={handleCreateSession}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-800 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-semibold truncate">
              {activeSession ? activeSession.name : 'AI Pentest Copilot'}
            </h1>
            {activeSession && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                    {activeSession.state.currentPhase}
                </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Chat Window */}
        {activeSession ? (
          <ChatWindow session={activeSession} onUpdate={loadSessions} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <Plus size={32} />
            </div>
            <p>Create or select a session to begin</p>
            <button 
                onClick={handleCreateSession}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition-colors"
            >
                New Engagement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
