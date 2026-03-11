import { getDb } from './database';

const DEFAULTS: Record<string, string> = {
  movement_multiplier: '1.5',
  theme: 'system',
  high_contrast: '0',
  onboarding_done: '0',
  movement_enabled: '1',
  timer_sound: 'chimes',
};

export async function getSetting(key: string): Promise<string> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  if (row?.value != null) return row.value;
  return DEFAULTS[key] ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key, value, value]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ key: string; value: string | null }>(
    'SELECT key, value FROM settings'
  );
  const out: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    if (row.value != null) out[row.key] = row.value;
  }
  return out;
}
