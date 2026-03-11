import { useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getSequences, getTimersBySequenceId } from '../db/sequences';
import { runSchedulerCheckNow } from '../services/scheduler';

export default function SettingsPage() {
  const theme = useTheme();
  const isDark = theme.resolved === 'dark';

  const runCheckNow = useCallback(async () => {
    try {
      const result = await runSchedulerCheckNow();
      alert(`Scheduler: ${result.message}`);
    } catch (e) {
      alert('Scheduler check failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const exportSequences = useCallback(async () => {
    const sequences = await getSequences();
    const data = await Promise.all(
      sequences.map(async (seq) => {
        const timers = await getTimersBySequenceId(seq.id);
        return {
          name: seq.name,
          loop_type: seq.loop_type,
          daily_limit_count: seq.daily_limit_count,
          timers: timers.map((t) => ({
            duration_seconds: t.duration_seconds || t.duration_minutes * 60,
            duration_minutes: t.duration_minutes,
            label: t.label,
            type: t.type,
            vibration_enabled: !!t.vibration_enabled,
          })),
        };
      })
    );
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('Sequences copied to clipboard.');
    } catch {
      alert('Could not copy. Data: ' + JSON.stringify(data, null, 2));
    }
  }, []);

  return (
    <div
      className={`p-5 min-h-full ${
        isDark ? 'bg-slate-900' : 'bg-slate-50'
      }`}
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
        Appearance
      </h2>
      <div
        className={`p-4 rounded-xl mb-2 flex justify-between items-center ${
          isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-slate-200'
        }`}
      >
        <span className="text-base text-slate-900 dark:text-slate-100">Dark mode</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={theme.theme === 'dark'}
            onChange={(e) => theme.setTheme(e.target.checked ? 'dark' : 'light')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>
      <div
        className={`p-4 rounded-xl mb-2 flex justify-between items-center ${
          isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-slate-200'
        }`}
      >
        <span className="text-base text-slate-900 dark:text-slate-100">Follow system theme</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={theme.theme === 'system'}
            onChange={(e) =>
              theme.setTheme(
                e.target.checked ? 'system' : (theme.resolved === 'dark' ? 'dark' : 'light')
              )
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>
      <div
        className={`p-4 rounded-xl mb-2 flex justify-between items-center ${
          isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-slate-200'
        }`}
      >
        <span className="text-base text-slate-900 dark:text-slate-100">High contrast</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={theme.highContrast}
            onChange={(e) => theme.setHighContrast(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:bg-sky-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
        Data
      </h2>
      <button
        onClick={exportSequences}
        className={`w-full p-4 rounded-xl mb-2 text-left text-sky-600 font-medium ${
          isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-slate-200'
        }`}
      >
        Export sequences
      </button>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
        Data is stored only on this device.
      </p>

      {import.meta.env.DEV && (
        <>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Developer
          </h2>
          <button
            onClick={runCheckNow}
            className={`w-full p-4 rounded-xl mb-2 text-left text-sky-600 font-medium ${
              isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-slate-200'
            }`}
          >
            Run scheduler check
          </button>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Runs the scheduler logic now. Timer keeps running when window is open or minimized.
          </p>
        </>
      )}
    </div>
  );
}
