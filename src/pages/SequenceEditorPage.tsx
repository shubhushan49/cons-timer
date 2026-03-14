import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import {
  getSequenceById,
  getTimersBySequenceId,
  createSequence,
  updateSequence,
  deleteSequence,
  createTimer,
  updateTimer,
  deleteTimer,
  reorderTimers,
} from '../db/sequences';
import type { SequenceRow, TimerRow, LoopType } from '../db/schema';
import { SequenceEditorRow } from '../components/SequenceEditorRow';
import { TimerPickerModal } from '../components/TimerPickerModal';
import { useTheme } from '../context/ThemeContext';
import { useTimer } from '../context/TimerContext';
import { clearAutoStarted } from '../services/scheduler';
import {
  scheduleStartTimeNotification,
  cancelStartTimeNotification,
} from '../services/notifications';
import { ChevronLeft, Play } from 'lucide-react';
import { playTimerEndSound, TIMER_SOUND_OPTIONS, type TimerSoundId } from '../services/sound';

function formatTime24(minutesSinceMidnight: number | null): string {
  if (minutesSinceMidnight == null) return 'Not set';
  const h = Math.floor(minutesSinceMidnight / 60);
  const m = minutesSinceMidnight % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type PickerTarget =
  | { type: 'duration'; timerIndex: number }
  | { type: 'startTime' }
  | { type: 'endTime' };

export default function SequenceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const timer = useTimer();
  const isDark = theme.resolved === 'dark';
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [loopType, setLoopType] = useState<LoopType>('indefinite');
  const [dailyLimit, setDailyLimit] = useState('5');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [soundId, setSoundId] = useState<TimerSoundId>('chimes');
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [loading, setLoading] = useState(!isNew);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerInitialValue, setPickerInitialValue] = useState(0);
  const [pickerMode, setPickerMode] = useState<'duration' | 'time'>('duration');

  useEffect(() => {
    if (isNew) return;
    const numId = parseInt(id!, 10);
    if (isNaN(numId)) return;
    getSequenceById(numId).then((seq) => {
      if (seq) {
        setName(seq.name);
        setLoopType(seq.loop_type);
        setDailyLimit(String(seq.daily_limit_count ?? 5));
        setStartTime(seq.start_time ?? null);
        setEndTime(seq.end_time ?? null);
        setSoundId((seq.sound_id as TimerSoundId) ?? 'chimes');
      }
      return getTimersBySequenceId(numId);
    }).then((list) => {
      if (list) setTimers(list);
      setLoading(false);
    });
  }, [id, isNew]);

  const addTimer = useCallback(() => {
    if (timers.length >= 20) return;
    setTimers((prev) => [
      ...prev,
      {
        id: -Date.now(),
        sequence_id: 0,
        order_index: prev.length,
        duration_minutes: 5,
        duration_seconds: 300,
        label: 'Break',
        type: 'break',
        sound_id: null,
        vibration_enabled: 1,
      } as TimerRow,
    ]);
  }, [timers.length]);

  const updateTimerAt = useCallback((index: number, patch: Partial<TimerRow>) => {
    setTimers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const openDurationPicker = useCallback((timerIndex: number) => {
    const t = timers[timerIndex];
    const currentSeconds = t.duration_seconds || t.duration_minutes * 60;
    setPickerTarget({ type: 'duration', timerIndex });
    setPickerInitialValue(currentSeconds);
    setPickerMode('duration');
    setPickerOpen(true);
  }, [timers]);

  const openTimePicker = useCallback((field: 'start' | 'end') => {
    const current = field === 'start' ? startTime : endTime;
    setPickerTarget(field === 'start' ? { type: 'startTime' } : { type: 'endTime' });
    setPickerInitialValue(current ?? 540);
    setPickerMode('time');
    setPickerOpen(true);
  }, [startTime, endTime]);

  const handlePickerConfirm = useCallback(
    (value: number) => {
      if (!pickerTarget) return;
      if (pickerTarget.type === 'duration') {
        updateTimerAt(pickerTarget.timerIndex, {
          duration_seconds: value,
          duration_minutes: Math.max(1, Math.ceil(value / 60)),
        });
      } else if (pickerTarget.type === 'startTime') {
        setStartTime(value);
      } else if (pickerTarget.type === 'endTime') {
        setEndTime(value);
      }
      setPickerOpen(false);
      setPickerTarget(null);
    },
    [pickerTarget, updateTimerAt]
  );

  const removeTimerAt = useCallback((index: number) => {
    setTimers((prev) =>
      prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, order_index: i }))
    );
  }, []);

  const moveTimer = useCallback((from: number, to: number) => {
    if (to < 0 || to >= timers.length) return;
    setTimers((prev) => {
      const next = [...prev];
      const [t] = next.splice(from, 1);
      next.splice(to, 0, { ...t, order_index: to });
      return next.map((x, i) => ({ ...x, order_index: i }));
    });
  }, [timers.length]);

  const save = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Give your sequence a name.');
      return;
    }
    if (timers.length === 0) {
      alert('Add at least one timer to the sequence.');
      return;
    }
    const dailyLimitNum =
      loopType === 'daily_limit' ? Math.max(1, parseInt(dailyLimit, 10) || 5) : null;

    setLoading(true);
    try {
      if (isNew) {
        const seqId = await createSequence(
          trimmed,
          loopType,
          dailyLimitNum,
          startTime,
          endTime,
          true,
          soundId
        );
        for (let i = 0; i < timers.length; i++) {
          const t = timers[i];
          const durSec = t.duration_seconds || t.duration_minutes * 60;
          await createTimer(
            seqId,
            i,
            durSec,
            t.label,
            t.type,
            null,
            !!t.vibration_enabled
          );
        }
        clearAutoStarted(seqId);
        if (startTime != null) {
          scheduleStartTimeNotification(seqId, trimmed, startTime).catch(() => {});
        }
        navigate('/sequences', { replace: true });
      } else {
        const numId = parseInt(id!, 10);
        await updateSequence(numId, trimmed, loopType, dailyLimitNum, startTime, endTime, soundId);
        const existing = await getTimersBySequenceId(numId);
        const existingIds = new Set(existing.map((x) => x.id));
        for (const t of existing.filter((x) => !timers.some((t2) => t2.id === x.id))) {
          await deleteTimer(t.id);
        }
        for (let i = 0; i < timers.length; i++) {
          const t = timers[i];
          const durSec = t.duration_seconds || t.duration_minutes * 60;
          if (t.id > 0 && existingIds.has(t.id)) {
            await updateTimer(
              t.id,
              durSec,
              t.label,
              t.type,
              null,
              !!t.vibration_enabled
            );
          } else {
            await createTimer(numId, i, durSec, t.label, t.type, t.sound_id, !!t.vibration_enabled);
          }
        }
        const afterSave = await getTimersBySequenceId(numId);
        await reorderTimers(numId, afterSave.map((t) => t.id));
        clearAutoStarted(numId);
        if (startTime != null) {
          scheduleStartTimeNotification(numId, trimmed, startTime).catch(() => {});
        } else {
          cancelStartTimeNotification(numId).catch(() => {});
        }
        navigate(-1);
      }
    } finally {
      setLoading(false);
    }
  }, [isNew, id, name, loopType, dailyLimit, startTime, endTime, soundId, timers, navigate]);

  const handleDelete = useCallback(async () => {
    if (isNew) return;
    if (!confirm('Delete this sequence?')) return;
    const numId = parseInt(id!, 10);
    if (isNaN(numId)) return;
    if (timer.runs.some((r) => r.sequence.id === numId)) {
      timer.stop(numId);
    }
    await cancelStartTimeNotification(numId);
    clearAutoStarted(numId);
    await deleteSequence(numId);
    navigate('/sequences', { replace: true });
  }, [isNew, id, timer, navigate]);

  if (loading && !isNew) {
    return (
      <div
        className={`min-h-screen p-5 ${
          isDark ? 'bg-slate-900' : 'bg-slate-100'
        }`}
      >
        <p className="text-center py-12 text-slate-900 dark:text-slate-100">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-slate-900' : 'bg-slate-100'
      }`}
    >
      <header className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 -ml-2 text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 shrink-0 pointer-events-none" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 text-center">
          {isNew ? 'New Sequence' : 'Edit Sequence'}
        </h1>
        <div className="w-10" />
      </header>

      <div className="p-5 pb-28">
        <label className="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-4">
          Sequence name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineer Default"
          className={`w-full rounded-xl px-4 py-3 text-base mb-5 ${
            isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
          }`}
        />

        <label className="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-4">
          Loop
        </label>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setLoopType('indefinite')}
            className={`flex-1 py-2.5 px-4 rounded-lg ${
              loopType === 'indefinite'
                ? 'bg-sky-600 text-white'
                : isDark
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
            }`}
          >
            Indefinite
          </button>
          <button
            onClick={() => setLoopType('daily_limit')}
            className={`flex-1 py-2.5 px-4 rounded-lg ${
              loopType === 'daily_limit'
                ? 'bg-sky-600 text-white'
                : isDark
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
            }`}
          >
            Daily limit
          </button>
        </div>
        {loopType === 'daily_limit' && (
          <input
            type="text"
            inputMode="numeric"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            placeholder="Cycles per day"
            className={`w-32 rounded-xl px-4 py-3 text-base mb-5 ${
              isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
            }`}
          />
        )}

        <label className="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-4">
          Schedule
        </label>
        <div
          className={`rounded-xl overflow-hidden mb-5 ${
            isDark ? 'bg-slate-800' : 'bg-white'
          }`}
        >
          <button
            onClick={() => openTimePicker('start')}
            className="w-full flex justify-between items-center py-3 px-4"
          >
            <span className="text-base text-slate-900 dark:text-slate-100">Start time</span>
            <span className="text-base text-slate-500 dark:text-slate-400 tabular-nums">
              {formatTime24(startTime)} ›
            </span>
          </button>
          <div className={`h-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
          <button
            onClick={() => openTimePicker('end')}
            className="w-full flex justify-between items-center py-3 px-4"
          >
            <span className="text-base text-slate-900 dark:text-slate-100">End time</span>
            <span className="text-base text-slate-500 dark:text-slate-400 tabular-nums">
              {formatTime24(endTime)} ›
            </span>
          </button>
          <div className={`h-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
          <div className="flex items-center justify-between py-3 px-4">
            <span className="text-base text-slate-900 dark:text-slate-100">Sound</span>
            <div className="flex items-center gap-2">
              <select
                value={soundId}
                onChange={(e) => setSoundId(e.target.value as TimerSoundId)}
                className={`rounded-lg px-3 py-1.5 text-sm border ${
                  isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {TIMER_SOUND_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => playTimerEndSound(soundId)}
                className={`rounded-lg p-2 ${isDark ? 'text-slate-400 hover:bg-slate-600' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Preview sound"
              >
                <Play className="size-4" />
              </button>
            </div>
          </div>
          {startTime != null && (
            <>
              <div className={`h-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
              <button
                onClick={() => {
                  setStartTime(null);
                  setEndTime(null);
                }}
                className="w-full py-3 px-4 text-left text-red-500"
              >
                Clear schedule
              </button>
            </>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 mb-2">
          <label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-4">
            Timers
          </label>
          <button
            onClick={addTimer}
            className={`py-1.5 px-4 rounded-full text-sm font-medium text-sky-600 ${
              isDark ? 'bg-sky-900/30' : 'bg-sky-100'
            }`}
          >
            + Add
          </button>
        </div>
        {timers.map((t, i) => (
          <SequenceEditorRow
            key={t.id}
            timer={t}
            index={i}
            isDark={isDark}
            onUpdate={(patch) => updateTimerAt(i, patch)}
            onRemove={() => removeTimerAt(i)}
            onMoveUp={i > 0 ? () => moveTimer(i, i - 1) : undefined}
            onMoveDown={i < timers.length - 1 ? () => moveTimer(i, i + 1) : undefined}
            onDurationTap={() => openDurationPicker(i)}
          />
        ))}
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 p-4 pt-3 border-t ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}
      >
        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full py-3 mb-3 text-red-500 dark:text-red-400 font-semibold text-base disabled:opacity-40 hover:bg-red-500/10 dark:hover:bg-red-400/10 rounded-xl"
          >
            Delete sequence
          </button>
        )}
        <button
          onClick={save}
          disabled={loading}
          className="w-full py-4 bg-sky-600 text-white rounded-xl font-semibold text-base disabled:opacity-40"
        >
          Save
        </button>
      </div>

      <TimerPickerModal
        isOpen={pickerOpen}
        mode={pickerMode}
        initialValue={pickerInitialValue}
        onConfirm={handlePickerConfirm}
        onCancel={() => {
          setPickerOpen(false);
          setPickerTarget(null);
        }}
      />
    </div>
  );
}
