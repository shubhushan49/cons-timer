import type { TimerStatus } from '../db/schema';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = {
  label: string;
  type: 'break' | 'work';
  remainingSeconds: number;
  progress: number;
  status: TimerStatus;
  highContrast?: boolean;
  onPause: () => void;
  onResume: () => void;
  onSnooze: () => void;
  onStop: () => void;
};

export function TimerCard({
  label,
  type,
  remainingSeconds,
  progress,
  status,
  highContrast,
  onPause,
  onResume,
  onSnooze,
  onStop,
}: Props) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused' || status === 'snoozed';

  return (
    <div
      className={`rounded-2xl p-6 mb-4 ${
        type === 'work'
          ? 'bg-sky-100 dark:bg-sky-900/30 border-2 border-sky-300 dark:border-sky-700'
          : 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700'
      } ${highContrast ? 'border-slate-900 dark:border-slate-100 border-[3px]' : ''}`}
      role="summary"
    >
      <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2" aria-label={`Timer: ${label}`}>
        {label}
      </p>
      <p className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3" aria-live="polite">
        {formatTime(remainingSeconds)}
      </p>
      <div className="h-2 bg-black/10 dark:bg-white/10 rounded mb-4 overflow-hidden">
        <div
          className="h-full bg-sky-600 rounded transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {isRunning && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPause(); }}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm"
              aria-label="Pause"
            >
              Pause
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSnooze(); }}
              className="px-4 py-2 rounded-lg bg-violet-500 text-white font-semibold text-sm"
              aria-label="Snooze 5 minutes"
            >
              Snooze
            </button>
          </>
        )}
        {isPaused && (
          <button
            onClick={(e) => { e.stopPropagation(); onResume(); }}
            className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold text-sm"
            aria-label="Resume"
          >
            Resume
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onStop(); }}
          className="px-6 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm min-w-[10rem]"
          aria-label="Stop sequence"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
