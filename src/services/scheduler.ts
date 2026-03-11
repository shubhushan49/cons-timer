import { getSequences, getSequenceById, getTimersBySequenceId } from '../db/sequences';
import type { SequenceRow, TimerRow } from '../db/schema';
import * as TimerEngine from './timerEngine';
import { scheduleAllStartTimeNotifications } from './notifications';

const CHECK_INTERVAL_MS = 30_000;

let checkInterval: ReturnType<typeof setInterval> | null = null;
let autoStartedToday = new Set<number>();
let lastDateStr = '';

function currentMinutesSinceMidnight(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resetDailyTracking(): void {
  const today = todayDateStr();
  if (today !== lastDateStr) {
    autoStartedToday = new Set();
    lastDateStr = today;
  }
}

async function check(): Promise<void> {
  try {
    resetDailyTracking();
    const now = currentMinutesSinceMidnight();
    const { runs } = TimerEngine.getState();

    for (const run of runs) {
      const freshSeq = await getSequenceById(run.sequence.id);
      const endTime = freshSeq?.end_time ?? run.sequence.end_time;
      if (endTime != null && now >= endTime) {
        TimerEngine.stop(run.sequence.id);
      }
    }

    const sequences = await getSequences();
    for (const seq of sequences) {
      if (seq.enabled !== 1) continue;
      if (seq.start_time == null || seq.end_time == null) continue;
      if (autoStartedToday.has(seq.id)) continue;

      const minsUntilStart = seq.start_time - now;

      if (now >= seq.start_time && now < seq.end_time) {
        console.log('[Scheduler] Starting', seq.name, 'now (window', formatTime(seq.start_time), '-', formatTime(seq.end_time) + ')');
        const timers = await getTimersBySequenceId(seq.id);
        if (timers.length > 0) {
          autoStartedToday.add(seq.id);
          await TimerEngine.start(seq, timers);
        }
      } else if (minsUntilStart > 0) {
        console.log('[Scheduler]', seq.name, 'will start at', formatTime(seq.start_time), '(' + minsUntilStart + 'min)');
      }
    }
  } catch (e) {
    console.warn('[Scheduler] Check error:', e);
  }
}

export function startScheduler(): void {
  stopScheduler();
  resetDailyTracking();
  setTimeout(check, 5000);
  checkInterval = setInterval(check, CHECK_INTERVAL_MS);
  setTimeout(() => scheduleAllStartTimeNotifications(), 6000);
  console.log('[Scheduler] Started, first check in 5s, then every', CHECK_INTERVAL_MS / 1000, 's');
}

export function stopScheduler(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

export function clearAutoStarted(sequenceId: number): void {
  autoStartedToday.delete(sequenceId);
}

export type SchedulerCheckResult = { started: string | null; message: string };

export async function runSchedulerCheckNow(): Promise<SchedulerCheckResult> {
  const now = currentMinutesSinceMidnight();
  console.log('[Scheduler] Check at', formatTime(now), '(manual trigger)');

  const { runs } = TimerEngine.getState();
  for (const run of runs) {
    const freshSeq = await getSequenceById(run.sequence.id);
    if (freshSeq?.end_time != null && now >= freshSeq.end_time) {
      TimerEngine.stop(run.sequence.id);
      return { started: null, message: 'Stopped (past end_time)' };
    }
  }

  const sequences = await getSequences();
  const started: string[] = [];
  for (const seq of sequences) {
    if (seq.enabled !== 1) continue;
    if (seq.start_time == null || seq.end_time == null) continue;

    if (now >= seq.start_time && now < seq.end_time) {
      const timers = await getTimersBySequenceId(seq.id);
      if (timers.length > 0) {
        await TimerEngine.start(seq, timers);
        started.push(seq.name);
      }
    }
  }
  if (started.length > 0) {
    return { started: started.join(', '), message: `Started ${started.length} sequence(s) in window` };
  }
  return { started: null, message: 'No sequence in window' };
}
