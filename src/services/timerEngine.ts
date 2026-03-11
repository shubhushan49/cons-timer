import type { TimerRow, SequenceRow, LoopType, TimerStatus } from '../db/schema';
import { getAllActiveRuns, saveActiveRun, deleteActiveRun } from '../db/timerState';
import { recordTimerCompletion } from '../db/stats';

const TICK_MS = 1000;
const PERSIST_INTERVAL_TICKS = 5;
const SNOOZE_SECONDS = 5 * 60;

export interface RunState {
  sequence: SequenceRow;
  timers: TimerRow[];
  currentTimerIndex: number;
  remainingSeconds: number;
  status: TimerStatus;
  runStartedAt: string | null;
  timerEndsAtMs: number | null;
}

export interface TimerEngineState {
  runs: RunState[];
}

export type OnTimerEndPayload = {
  sequenceId: number;
  label: string;
  type: 'break' | 'work';
  nextLabel?: string;
  vibrationEnabled: boolean;
  soundId: string | null;
};

export type TimerEngineListener = (state: TimerEngineState) => void;
export type OnTimerEndListener = (payload: OnTimerEndPayload) => void;
export type ScheduleNotificationFn = (
  sequenceId: number,
  secondsFromNow: number,
  type: 'break' | 'work',
  label: string
) => void;
export type CancelNotificationFn = (sequenceId: number) => void;

const runs = new Map<number, RunState>();
let tickInterval: ReturnType<typeof setInterval> | null = null;
let tickCount = 0;
const listeners = new Set<TimerEngineListener>();
let onTimerEndCallback: OnTimerEndListener | null = null;
let scheduleNotificationFn: ScheduleNotificationFn | null = null;
let cancelNotificationFn: CancelNotificationFn | null = null;

function notifyListeners(): void {
  const state: TimerEngineState = { runs: Array.from(runs.values()) };
  listeners.forEach((cb) => cb(state));
}

async function persist(): Promise<void> {
  for (const run of runs.values()) {
    await saveActiveRun(
      run.sequence.id,
      run.currentTimerIndex,
      run.remainingSeconds,
      run.status,
      run.runStartedAt
    );
  }
}

function stopTicker(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  for (const run of runs.values()) {
    run.timerEndsAtMs = null;
  }
}

function syncEndTime(run: RunState): void {
  if (run.status === 'running' && run.remainingSeconds > 0) {
    run.timerEndsAtMs = Date.now() + run.remainingSeconds * 1000;
  } else {
    run.timerEndsAtMs = null;
  }
}

async function advanceToNextTimer(run: RunState): Promise<boolean> {
  const current = run.timers[run.currentTimerIndex];
  const sequence = run.sequence;
  const timers = run.timers;
  if (!sequence || !timers.length) return false;

  const isBreak = current?.type === 'break';
  if (current) {
    await recordTimerCompletion(sequence.id, run.currentTimerIndex + 1, isBreak);
  }

  const nextIndex = run.currentTimerIndex + 1;
  if (nextIndex >= timers.length) {
    const loopType = sequence.loop_type as LoopType;
    if (loopType === 'daily_limit') {
      const limit = sequence.daily_limit_count ?? 0;
      const completedCycles = Math.floor((run.currentTimerIndex + 1) / timers.length);
      if (completedCycles >= limit) {
        if (onTimerEndCallback && current) {
          onTimerEndCallback({
            sequenceId: sequence.id,
            label: current.label,
            type: current.type,
            vibrationEnabled: !!current.vibration_enabled,
            soundId: sequence.sound_id ?? null,
          });
        }
        runs.delete(sequence.id);
        cancelNotificationFn?.(sequence.id);
        await deleteActiveRun(sequence.id);
        if (runs.size === 0) stopTicker();
        notifyListeners();
        return false;
      }
    }
    run.currentTimerIndex = 0;
  } else {
    run.currentTimerIndex = nextIndex;
  }

  const next = run.timers[run.currentTimerIndex];
  run.remainingSeconds = next ? next.duration_seconds || next.duration_minutes * 60 : 0;
  syncEndTime(run);
  notifyListeners();
  await persist();
  if (next && scheduleNotificationFn) {
    scheduleNotificationFn(sequence.id, run.remainingSeconds, next.type, next.label);
  }
  if (onTimerEndCallback && current) {
    onTimerEndCallback({
      sequenceId: sequence.id,
      label: current.label,
      type: current.type,
      nextLabel: next?.label,
      vibrationEnabled: !!current.vibration_enabled,
      soundId: sequence.sound_id ?? null,
    });
  }
  return true;
}

async function onTick(): Promise<void> {
  let anyChanged = false;
  for (const run of runs.values()) {
    if (run.status !== 'running') continue;
    const current = run.timers[run.currentTimerIndex];
    if (!current || !run.timerEndsAtMs) continue;

    run.remainingSeconds = Math.max(0, Math.ceil((run.timerEndsAtMs - Date.now()) / 1000));
    if (run.remainingSeconds <= 0) {
      await advanceToNextTimer(run);
      anyChanged = true;
    }
  }
  tickCount++;
  if (tickCount >= PERSIST_INTERVAL_TICKS) {
    tickCount = 0;
    await persist();
  }
  if (anyChanged) {
    notifyListeners();
  } else {
    notifyListeners();
  }
}

export function setOnTimerEnd(cb: OnTimerEndListener | null): void {
  onTimerEndCallback = cb;
}

export function setNotificationFns(
  schedule: ScheduleNotificationFn | null,
  cancel: CancelNotificationFn | null
): void {
  scheduleNotificationFn = schedule;
  cancelNotificationFn = cancel;
}

export function subscribe(listener: TimerEngineListener): () => void {
  listeners.add(listener);
  listener({ runs: Array.from(runs.values()) });
  return () => listeners.delete(listener);
}

export function getState(): TimerEngineState {
  return { runs: Array.from(runs.values()) };
}

export async function loadPersistedState(
  getSequence: (id: number) => Promise<SequenceRow | null>,
  getTimers: (sequenceId: number) => Promise<TimerRow[]>
): Promise<void> {
  const saved = await getAllActiveRuns();
  for (const row of saved) {
    const sequence = await getSequence(row.sequence_id);
    const timers = await getTimers(row.sequence_id);
    if (!sequence || !timers.length) continue;
    const run: RunState = {
      sequence,
      timers,
      currentTimerIndex: Math.min(row.current_timer_index, timers.length - 1),
      remainingSeconds: row.remaining_seconds,
      status: row.status as TimerStatus,
      runStartedAt: row.run_started_at,
      timerEndsAtMs: null,
    };
    syncEndTime(run);
    runs.set(sequence.id, run);
    if (run.status === 'running' && run.timers[run.currentTimerIndex] && scheduleNotificationFn) {
      const t = run.timers[run.currentTimerIndex];
      scheduleNotificationFn(sequence.id, run.remainingSeconds, t.type, t.label);
    }
  }
  notifyListeners();
  if (runs.size > 0) {
    stopTicker();
    for (const run of runs.values()) {
      syncEndTime(run);
    }
    tickInterval = setInterval(onTick, TICK_MS);
  }
}

export async function start(sequence: SequenceRow, timers: TimerRow[]): Promise<void> {
  if (!timers.length) return;

  const existing = runs.get(sequence.id);
  if (existing) {
    // Already running - just ensure it's running state
    return;
  }

  const run: RunState = {
    sequence,
    timers,
    currentTimerIndex: 0,
    remainingSeconds: timers[0].duration_seconds || timers[0].duration_minutes * 60,
    status: 'running',
    runStartedAt: new Date().toISOString(),
    timerEndsAtMs: null,
  };
  syncEndTime(run);
  runs.set(sequence.id, run);
  notifyListeners();
  await saveActiveRun(
    sequence.id,
    run.currentTimerIndex,
    run.remainingSeconds,
    run.status,
    run.runStartedAt
  );
  if (scheduleNotificationFn && timers[0]) {
    scheduleNotificationFn(sequence.id, run.remainingSeconds, timers[0].type, timers[0].label);
  }
  if (!tickInterval) {
    tickInterval = setInterval(onTick, TICK_MS);
  }
}

export function pause(sequenceId: number): void {
  const run = runs.get(sequenceId);
  if (!run || run.status !== 'running') return;
  run.status = 'paused';
  run.timerEndsAtMs = null;
  cancelNotificationFn?.(sequenceId);
  notifyListeners();
  persist();
}

export function resume(sequenceId: number): void {
  const run = runs.get(sequenceId);
  if (!run || (run.status !== 'paused' && run.status !== 'snoozed')) return;
  run.status = 'running';
  syncEndTime(run);
  const current = run.timers[run.currentTimerIndex];
  if (current && scheduleNotificationFn) {
    scheduleNotificationFn(sequenceId, run.remainingSeconds, current.type, current.label);
  }
  notifyListeners();
  persist();
  if (!tickInterval) {
    tickInterval = setInterval(onTick, TICK_MS);
  }
}

export function snooze(sequenceId: number): void {
  const run = runs.get(sequenceId);
  if (!run) return;
  run.remainingSeconds += SNOOZE_SECONDS;
  run.status = 'snoozed';
  const current = run.timers[run.currentTimerIndex];
  if (current && scheduleNotificationFn) {
    scheduleNotificationFn(sequenceId, run.remainingSeconds, current.type, current.label);
  }
  notifyListeners();
  persist();
  resume(sequenceId);
}

export function stop(sequenceId: number): void {
  const run = runs.get(sequenceId);
  if (!run) return;
  cancelNotificationFn?.(sequenceId);
  runs.delete(sequenceId);
  deleteActiveRun(sequenceId);
  notifyListeners();
  if (runs.size === 0) {
    stopTicker();
  }
}

export function isTimerActive(): boolean {
  return runs.size > 0 && Array.from(runs.values()).some((r) => r.status === 'running');
}
