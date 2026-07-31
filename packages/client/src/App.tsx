import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { sessionsApi } from './api';
import type { Session } from '@ai-pentest/contracts';
import { SessionSidebar } from './components/SessionSidebar';
import { ChatWindow } from './components/ChatWindow';
import { Menu, Plus, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

// Settings Pages
import { SettingsLayout } from './pages/settings/SettingsLayout';
import { GeneralSettings } from './pages/settings/GeneralSettings';
import { ModelManager } from './pages/settings/ModelManager';
import { PromptManager } from './pages/settings/PromptManager';
import { KnowledgeBaseManager } from './pages/settings/KnowledgeBaseManager';
import { WorkflowViewer } from './pages/settings/WorkflowViewer';
import { AuditLogViewer } from './pages/settings/AuditLogViewer';

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
    <Router>
      <div className="flex h-screen w-full bg-zinc-900 text-gray-100 overflow-hidden font-sans">
        <Routes>
          {/* Main Chat Route */}
          <Route path="/" element={
            <div className="flex w-full h-full">
                {isSidebarOpen && (
                    <SessionSidebar 
                    sessions={sessions} 
                    activeSession={activeSession} 
                    onSelect={setActiveSession}
                    onNew={handleCreateSession}
                    />
                )}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <header className="h-14 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-zinc-800 rounded-lg"
                        >
                        <Menu size={20} />
                        </button>
                        <h1 className="font-semibold truncate text-sm">
                        {activeSession ? activeSession.name : 'AI Pentest Copilot'}
                        </h1>
                        {activeSession && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 uppercase font-bold tracking-tighter">
                                {activeSession.state.currentPhase}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <NavLink to="/settings/general" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                            <Settings size={20} />
                        </NavLink>
                    </div>
                    </header>

                    {activeSession ? (
                    <ChatWindow session={activeSession} onUpdate={loadSessions} />
                    ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col gap-4">
                        <Plus size={48} className="text-zinc-800" />
                        <p>No active engagement</p>
                        <button onClick={handleCreateSession} className="bg-blue-600 px-4 py-2 rounded-lg text-white font-medium">New Engagement</button>
                    </div>
                    )}
                </div>
            </div>
          } />

          {/* Settings Routes */}
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="models" element={<ModelManager />} />
            <Route path="prompts" element={<PromptManager />} />
            <Route path="knowledge" element={<KnowledgeBaseManager />} />
            <Route path="workflows" element={<WorkflowViewer />} />
            <Route path="logs" element={<AuditLogViewer />} />
            <Route path="safety" element={<div className="p-4">Safety Rules Page (Coming Soon)</div>} />
            <Route path="extensions" element={<div className="p-4">Extensions Page (Coming Soon)</div>} />
            <Route path="advanced" element={<div className="p-4">Advanced Config (Coming Soon)</div>} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}
