export type LoopType = 'indefinite' | 'daily_limit';
export type TimerType = 'break' | 'work';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'snoozed';

export interface SequenceRow {
  id: number;
  name: string;
  loop_type: LoopType;
  daily_limit_count: number | null;
  start_time: number | null;
  end_time: number | null;
  enabled: number;
  sound_id: string | null;
  created_at: string;
}

export interface TimerRow {
  id: number;
  sequence_id: number;
  order_index: number;
  duration_minutes: number;
  duration_seconds: number;
  label: string;
  type: TimerType;
  sound_id: string | null;
  vibration_enabled: number;
}

export interface TimerStateRow {
  id: number;
  sequence_id: number | null;
  current_timer_index: number;
  remaining_seconds: number;
  status: TimerStatus;
  movement_bonus_seconds: number;
  run_started_at: string | null;
}

export interface DailyStatsRow {
  date: string;
  breaks_taken: number;
  movement_bonus_minutes: number;
}
