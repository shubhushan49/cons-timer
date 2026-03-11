import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, List, Settings } from 'lucide-react';

export default function TabLayout() {
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <nav className="flex border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 text-sm transition-colors ${
              isActive
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          Dashboard
        </NavLink>
        <NavLink
          to="/sequences"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 text-sm transition-colors ${
              isActive
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`
          }
        >
          <List className="w-5 h-5 mb-1" />
          Sequences
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 text-sm transition-colors ${
              isActive
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`
          }
        >
          <Settings className="w-5 h-5 mb-1" />
          Settings
        </NavLink>
      </nav>
    </div>
  );
}
