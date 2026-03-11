import type { TimerRow } from '../db/schema';

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${String(m).padStart(2, '0')}m`);
  parts.push(`${String(s).padStart(2, '0')}s`);
  return parts.join(' ');
}

type Props = {
  timer: TimerRow;
  index: number;
  isDark: boolean;
  onUpdate: (patch: Partial<TimerRow>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDurationTap: () => void;
};

export function SequenceEditorRow({
  timer,
  index,
  isDark,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDurationTap,
}: Props) {
  const displaySeconds = timer.duration_seconds || timer.duration_minutes * 60;

  return (
    <div
      className={`rounded-xl overflow-hidden mb-3 ${
        isDark ? 'bg-slate-800' : 'bg-white'
      } border border-slate-200 dark:border-slate-700`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-base font-bold leading-none"
          aria-label="Remove timer"
        >
          -
        </button>
        <input
          type="text"
          value={timer.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Timer name"
          className={`flex-1 text-base bg-transparent ${
            isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
          }`}
          aria-label={`Timer ${index + 1} label`}
        />
        <div className="flex gap-1">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              aria-label="Move up"
              className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs"
            >
              ▲
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              aria-label="Move down"
              className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs"
            >
              ▼
            </button>
          )}
        </div>
      </div>

      <div className={`h-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />

      <button
        onClick={onDurationTap}
        className="w-full flex items-center justify-between px-4 py-3"
        aria-label={`Duration: ${formatDuration(displaySeconds)}. Tap to change.`}
      >
        <span className={`text-base ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Duration</span>
        <span className={`flex items-center gap-1 text-base tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {formatDuration(displaySeconds)}
          <span className="text-xl font-semibold">›</span>
        </span>
      </button>

      <div className={`h-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />

      <div className="flex items-center justify-between px-4 py-2">
        <span className={`text-base ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Vibration</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={!!timer.vibration_enabled}
            onChange={(e) => onUpdate({ vibration_enabled: e.target.checked ? 1 : 0 })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>
    </div>
  );
}
