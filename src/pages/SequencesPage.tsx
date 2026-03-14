import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../context/ThemeContext';
import { getSequences, getTimersBySequenceId, setSequenceEnabled, deleteSequence } from '../db/sequences';
import {
  scheduleStartTimeNotification,
  cancelStartTimeNotification,
} from '../services/notifications';
import { clearAutoStarted } from '../services/scheduler';
import type { SequenceRow } from '../db/schema';
import { Trash2 } from 'lucide-react';

function formatTime24(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const theme = useTheme();
  const timer = useTimer();
  const navigate = useNavigate();
  const isDark = theme.resolved === 'dark';

  const load = useCallback(async () => {
    setSequences(await getSequences());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startSequence = useCallback(
    async (seq: SequenceRow) => {
      const timers = await getTimersBySequenceId(seq.id);
      if (timers.length) {
        await timer.start(seq, timers);
        navigate('/dashboard', { replace: true });
      }
    },
    [timer, navigate]
  );

  const toggleEnabled = useCallback(
    async (e: React.MouseEvent, seq: SequenceRow) => {
      e.stopPropagation();
      const nextEnabled = (seq.enabled ?? 1) !== 1;
      await setSequenceEnabled(seq.id, nextEnabled);
      if (nextEnabled && seq.start_time != null) {
        await scheduleStartTimeNotification(seq.id, seq.name, seq.start_time);
      } else {
        await cancelStartTimeNotification(seq.id);
      }
      load();
    },
    [load]
  );

  const runningSequenceIds = new Set(timer.runs.map((r) => r.sequence.id));

  const handleDelete = useCallback(
    async (e: React.MouseEvent, seq: SequenceRow) => {
      e.stopPropagation();
      if (!confirm('Delete this sequence?')) return;
      if (timer.runs.some((r) => r.sequence.id === seq.id)) {
        timer.stop(seq.id);
      }
      await cancelStartTimeNotification(seq.id);
      clearAutoStarted(seq.id);
      await deleteSequence(seq.id);
      load();
    },
    [timer, load]
  );

  return (
    <div
      className={`p-5 min-h-full ${
        isDark ? 'bg-slate-900' : 'bg-slate-50'
      }`}
    >
      <button
        onClick={() => navigate('/sequence/new')}
        className={`w-full py-4 rounded-xl mb-4 text-center font-semibold text-sky-600 ${
          isDark ? 'bg-slate-800' : 'bg-slate-200'
        }`}
      >
        + New sequence
      </button>

      {sequences.length === 0 ? (
        <p className="text-center py-12 text-slate-500 dark:text-slate-400">
          No sequences yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
              }`}
              onClick={() => navigate(`/sequence/${seq.id}`)}
            >
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{seq.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {seq.loop_type === 'indefinite'
                  ? 'Repeats indefinitely'
                  : `Up to ${seq.daily_limit_count} cycles/day`}
              </p>
              {seq.start_time != null && seq.end_time != null && (
                <p className="text-sm text-sky-600 dark:text-sky-400 mt-0.5 tabular-nums">
                  {formatTime24(seq.start_time)} – {formatTime24(seq.end_time)}
                </p>
              )}
              <div className="mt-3 flex gap-2 items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!runningSequenceIds.has(seq.id)) startSequence(seq);
                  }}
                  disabled={runningSequenceIds.has(seq.id)}
                  className={`py-2.5 px-4 rounded-lg font-semibold text-sm ${
                    runningSequenceIds.has(seq.id)
                      ? 'bg-slate-400 text-white cursor-not-allowed'
                      : 'bg-sky-600 text-white'
                  }`}
                >
                  {runningSequenceIds.has(seq.id) ? 'Running' : 'Start'}
                </button>
                <button
                  onClick={(e) => toggleEnabled(e, seq)}
                  className={`py-2.5 px-4 rounded-lg font-semibold text-sm ${
                    (seq.enabled ?? 1) === 1
                      ? 'bg-slate-600 text-white hover:bg-slate-500'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {(seq.enabled ?? 1) === 1 ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={(e) => handleDelete(e, seq)}
                  className="ml-auto p-2 rounded-lg text-red-500 dark:text-red-400 bg-red-500/15 dark:bg-red-500/20 hover:bg-red-500/25 dark:hover:bg-red-500/30"
                  aria-label="Delete sequence"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
