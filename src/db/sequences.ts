import { getDb } from './database';
import type { SequenceRow, TimerRow, LoopType, TimerType } from './schema';

export async function getSequences(): Promise<SequenceRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<SequenceRow>('SELECT * FROM sequences ORDER BY created_at DESC');
  return rows;
}

export async function getSequenceById(id: number): Promise<SequenceRow | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<SequenceRow>('SELECT * FROM sequences WHERE id = ?', [id]);
  return row ?? null;
}

export async function createSequence(
  name: string,
  loopType: LoopType,
  dailyLimitCount: number | null,
  startTime: number | null = null,
  endTime: number | null = null,
  enabled: boolean = true,
  soundId: string | null = 'chimes'
): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO sequences (name, loop_type, daily_limit_count, start_time, end_time, enabled, sound_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, loopType, dailyLimitCount, startTime, endTime, enabled ? 1 : 0, soundId]
  );
  return result.lastInsertRowId;
}

export async function updateSequence(
  id: number,
  name: string,
  loopType: LoopType,
  dailyLimitCount: number | null,
  startTime: number | null = null,
  endTime: number | null = null,
  soundId: string | null = 'chimes'
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'UPDATE sequences SET name = ?, loop_type = ?, daily_limit_count = ?, start_time = ?, end_time = ?, sound_id = ? WHERE id = ?',
    [name, loopType, dailyLimitCount, startTime, endTime, soundId, id]
  );
}

export async function deleteSequence(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM timers WHERE sequence_id = ?', [id]);
  await database.runAsync('DELETE FROM sequences WHERE id = ?', [id]);
}

export async function setSequenceEnabled(id: number, enabled: boolean): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE sequences SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
}

export async function getTimersBySequenceId(sequenceId: number): Promise<TimerRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<TimerRow>(
    'SELECT * FROM timers WHERE sequence_id = ? ORDER BY order_index ASC',
    [sequenceId]
  );
  return rows;
}

export async function createTimer(
  sequenceId: number,
  orderIndex: number,
  durationSeconds: number,
  label: string,
  type: TimerType,
  soundId: string | null,
  vibrationEnabled: boolean
): Promise<number> {
  const database = await getDb();
  const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const result = await database.runAsync(
    'INSERT INTO timers (sequence_id, order_index, duration_minutes, duration_seconds, label, type, sound_id, vibration_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [sequenceId, orderIndex, durationMinutes, durationSeconds, label, type, soundId, vibrationEnabled ? 1 : 0]
  );
  return result.lastInsertRowId;
}

export async function updateTimer(
  id: number,
  durationSeconds: number,
  label: string,
  type: TimerType,
  soundId: string | null,
  vibrationEnabled: boolean
): Promise<void> {
  const database = await getDb();
  const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  await database.runAsync(
    'UPDATE timers SET duration_minutes = ?, duration_seconds = ?, label = ?, type = ?, sound_id = ?, vibration_enabled = ? WHERE id = ?',
    [durationMinutes, durationSeconds, label, type, soundId, vibrationEnabled ? 1 : 0, id]
  );
}

export async function deleteTimer(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM timers WHERE id = ?', [id]);
}

export async function reorderTimers(sequenceId: number, timerIds: number[]): Promise<void> {
  const database = await getDb();
  for (let i = 0; i < timerIds.length; i++) {
    await database.runAsync('UPDATE timers SET order_index = ? WHERE id = ? AND sequence_id = ?', [
      i,
      timerIds[i],
      sequenceId,
    ]);
  }
}
