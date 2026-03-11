import { getDb } from './database';
import type { DailyStatsRow } from './schema';

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyStats(date: string): Promise<DailyStatsRow | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<DailyStatsRow>('SELECT * FROM daily_stats WHERE date = ?', [
    date,
  ]);
  return row ?? null;
}

export async function getTodayStats(): Promise<{ breaks_taken: number; movement_bonus_minutes: number }> {
  const row = await getDailyStats(todayDate());
  return {
    breaks_taken: row?.breaks_taken ?? 0,
    movement_bonus_minutes: row?.movement_bonus_minutes ?? 0,
  };
}

export async function recordTimerCompletion(
  sequenceId: number,
  completedCount: number,
  isBreak: boolean
): Promise<void> {
  const database = await getDb();
  const date = todayDate();
  await database.runAsync(
    `INSERT INTO daily_stats (date, breaks_taken, movement_bonus_minutes) VALUES (?, 0, 0)
     ON CONFLICT(date) DO NOTHING`,
    [date]
  );
  if (isBreak) {
    await database.runAsync(
      'UPDATE daily_stats SET breaks_taken = breaks_taken + 1 WHERE date = ?',
      [date]
    );
  }
  await database.runAsync(
    'INSERT INTO timer_runs (sequence_id, started_at, ended_at, completed_timers_count) VALUES (?, datetime("now"), datetime("now"), ?)',
    [sequenceId, completedCount]
  );
}

export async function addMovementBonus(minutes: number): Promise<void> {
  const database = await getDb();
  const date = todayDate();
  await database.runAsync(
    `INSERT INTO daily_stats (date, breaks_taken, movement_bonus_minutes) VALUES (?, 0, 0)
     ON CONFLICT(date) DO NOTHING`,
    [date]
  );
  await database.runAsync(
    'UPDATE daily_stats SET movement_bonus_minutes = movement_bonus_minutes + ? WHERE date = ?',
    [minutes, date]
  );
}
