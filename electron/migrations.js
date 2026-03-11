// Inlined from db/schema.ts MIGRATIONS - used by Electron main process
module.exports = {
  MIGRATIONS: [
    `CREATE TABLE IF NOT EXISTS sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      loop_type TEXT NOT NULL CHECK(loop_type IN ('indefinite', 'daily_limit')),
      daily_limit_count INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK(duration_minutes >= 1 AND duration_minutes <= 120),
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('break', 'work')),
      sound_id TEXT,
      vibration_enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS timer_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      completed_timers_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (sequence_id) REFERENCES sequences(id)
    );`,
    `CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      breaks_taken INTEGER NOT NULL DEFAULT 0,
      movement_bonus_minutes REAL NOT NULL DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS timer_state (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      sequence_id INTEGER,
      current_timer_index INTEGER NOT NULL DEFAULT 0,
      remaining_seconds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'running', 'paused', 'snoozed')),
      movement_bonus_seconds INTEGER NOT NULL DEFAULT 0,
      run_started_at TEXT,
      FOREIGN KEY (sequence_id) REFERENCES sequences(id)
    );`,
    `INSERT OR IGNORE INTO timer_state (id, sequence_id, current_timer_index, remaining_seconds, status, movement_bonus_seconds) VALUES (1, NULL, 0, 0, 'idle', 0);`,
    `ALTER TABLE timers ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0;`,
    `UPDATE timers SET duration_seconds = duration_minutes * 60 WHERE duration_seconds = 0;`,
    `CREATE TABLE IF NOT EXISTS timers_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 1,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('break', 'work')),
      sound_id TEXT,
      vibration_enabled INTEGER NOT NULL DEFAULT 1,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE
    );`,
    `INSERT OR IGNORE INTO timers_v3 (id, sequence_id, order_index, duration_minutes, label, type, sound_id, vibration_enabled, duration_seconds)
       SELECT id, sequence_id, order_index, duration_minutes, label, type, sound_id, vibration_enabled, duration_seconds FROM timers;`,
    `DROP TABLE IF EXISTS timers;`,
    `ALTER TABLE timers_v3 RENAME TO timers;`,
    `ALTER TABLE sequences ADD COLUMN start_time INTEGER;`,
    `ALTER TABLE sequences ADD COLUMN end_time INTEGER;`,
    `ALTER TABLE sequences ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;`,
    `ALTER TABLE sequences ADD COLUMN sound_id TEXT;`,
    `CREATE TABLE IF NOT EXISTS active_runs (
      sequence_id INTEGER PRIMARY KEY,
      current_timer_index INTEGER NOT NULL DEFAULT 0,
      remaining_seconds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'paused', 'snoozed')),
      run_started_at TEXT,
      FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE
    );`,
  ],
};
