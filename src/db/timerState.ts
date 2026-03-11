import { getDb } from './database';
import type { TimerStatus } from './schema';

export interface ActiveRunRow {
  sequence_id: number;
  current_timer_index: number;
  remaining_seconds: number;
  status: TimerStatus;
  run_started_at: string | null;
}

export async function getAllActiveRuns(): Promise<ActiveRunRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<ActiveRunRow>(
    "SELECT sequence_id, current_timer_index, remaining_seconds, status, run_started_at FROM active_runs WHERE status IN ('running', 'paused', 'snoozed')"
  );
  return rows ?? [];
}

export async function saveActiveRun(
  sequenceId: number,
  currentTimerIndex: number,
  remainingSeconds: number,
  status: TimerStatus,
  runStartedAt: string | null
): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM active_runs WHERE sequence_id = ?', [sequenceId]);
  await database.runAsync(
    `INSERT INTO active_runs (sequence_id, current_timer_index, remaining_seconds, status, run_started_at)
     VALUES (?, ?, ?, ?, ?)`,
    [sequenceId, currentTimerIndex, remainingSeconds, status, runStartedAt]
  );
}

export async function deleteActiveRun(sequenceId: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM active_runs WHERE sequence_id = ?', [sequenceId]);
}

// Legacy - for migration from timer_state
export interface TimerStateRow {
  id: number;
  sequence_id: number | null;
  current_timer_index: number;
  remaining_seconds: number;
  status: TimerStatus;
  movement_bonus_seconds: number;
  run_started_at: string | null;
}

export async function getTimerState(): Promise<TimerStateRow | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<TimerStateRow>('SELECT * FROM timer_state WHERE id = 1');
  return row ?? null;
}

export async function saveTimerState(
  sequenceId: number | null,
  currentTimerIndex: number,
  remainingSeconds: number,
  status: TimerStatus,
  movementBonusSeconds: number,
  runStartedAt: string | null
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE timer_state SET sequence_id = ?, current_timer_index = ?, remaining_seconds = ?, status = ?, movement_bonus_seconds = ?, run_started_at = ? WHERE id = 1`,
    [sequenceId, currentTimerIndex, remainingSeconds, status, movementBonusSeconds, runStartedAt]
  );
}
