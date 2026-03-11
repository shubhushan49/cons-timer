import { useNavigate } from 'react-router-dom';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../context/ThemeContext';
import { TimerCard } from '../components/TimerCard';
import type { RunState } from '../services/timerEngine';

export default function DashboardPage() {
  const timer = useTimer();
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <div
      className={`p-5 min-h-full ${
        theme.resolved === 'dark' ? 'bg-slate-900' : 'bg-slate-50'
      } ${theme.highContrast ? 'ring-2 ring-slate-900 dark:ring-slate-100' : ''}`}
    >
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Pomodoro Flex</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
          {timer.runs.length > 0
            ? `${timer.runs.length} sequence${timer.runs.length === 1 ? '' : 's'} running`
            : 'No sequence running'}
        </p>
      </section>

      {timer.runs.length > 0 ? (
        <div className="space-y-4">
          {timer.runs.map((run) => (
            <RunCard
              key={run.sequence.id}
              run={run}
              onPause={() => timer.pause(run.sequence.id)}
              onResume={() => timer.resume(run.sequence.id)}
              onSnooze={() => timer.snooze(run.sequence.id)}
              onStop={() => timer.stop(run.sequence.id)}
              highContrast={theme.highContrast}
              onNavigateToEdit={() => navigate(`/sequence/${run.sequence.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <p className="text-base text-slate-500 dark:text-slate-400 text-center mb-4">
            Start a sequence from the Sequences tab.
          </p>
          <button
            onClick={() => navigate('/sequences')}
            className="py-3 px-6 bg-sky-600 text-white rounded-xl font-semibold"
          >
            Choose sequence
          </button>
        </div>
      )}

    </div>
  );
}

function RunCard({
  run,
  onPause,
  onResume,
  onSnooze,
  onStop,
  highContrast,
  onNavigateToEdit,
}: {
  run: RunState;
  onPause: () => void;
  onResume: () => void;
  onSnooze: () => void;
  onStop: () => void;
  highContrast: boolean;
  onNavigateToEdit: () => void;
}) {
  const currentTimer = run.timers[run.currentTimerIndex];
  const totalSeconds = currentTimer
    ? currentTimer.duration_seconds || currentTimer.duration_minutes * 60
    : 0;
  const progress = totalSeconds > 0 ? 1 - run.remainingSeconds / totalSeconds : 0;

  return (
    <div
      onClick={onNavigateToEdit}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onNavigateToEdit()}
      aria-label={`Edit ${run.sequence.name}`}
    >
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
        {run.sequence.name}
      </p>
      <TimerCard
        label={currentTimer?.label ?? 'Timer'}
        type={currentTimer?.type ?? 'work'}
        remainingSeconds={run.remainingSeconds}
        progress={progress}
        status={run.status}
        highContrast={highContrast}
        onPause={onPause}
        onResume={onResume}
        onSnooze={onSnooze}
        onStop={onStop}
      />
    </div>
  );
}
