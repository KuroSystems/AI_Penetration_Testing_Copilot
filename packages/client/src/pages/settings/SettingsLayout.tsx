import { NavLink, Outlet } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  BookOpen, 
  Cpu, 
  Terminal, 
  ShieldCheck, 
  History,
  FileText,
  Boxes,
  Zap,
  Activity
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/settings/general', icon: SettingsIcon, label: 'General' },
  { to: '/settings/models', icon: Cpu, label: 'Models' },
  { to: '/settings/prompts', icon: FileText, label: 'Prompts' },
  { to: '/settings/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { to: '/settings/workflows', icon: History, label: 'Workflows' },
  { to: '/settings/safety', icon: ShieldCheck, label: 'Safety Rules' },
  { to: '/settings/analytics', icon: Activity, label: 'Analytics' },
  { to: '/settings/marketplace', icon: Boxes, label: 'Marketplace' },
  { to: '/settings/logs', icon: Terminal, label: 'Audit Logs' },
  { to: '/settings/advanced', icon: Zap, label: 'Advanced' },
];

export function SettingsLayout() {
  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-900">
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon size={24} className="text-blue-500" /> Settings
          </h2>
        </div>
        
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-900 p-8">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
