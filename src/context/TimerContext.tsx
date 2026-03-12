import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { RunState, TimerEngineState } from '../services/timerEngine';
import * as TimerEngine from '../services/timerEngine';
import { getSequenceById, getTimersBySequenceId } from '../db/sequences';
import type { SequenceRow, TimerRow } from '../db/schema';
import * as NotifService from '../services/notifications';
import * as Scheduler from '../services/scheduler';
import { playTimerEndSound, type TimerSoundId } from '../services/sound';

type TimerContextValue = TimerEngineState & {
  start: (sequence: SequenceRow, timers: TimerRow[]) => Promise<void>;
  pause: (sequenceId: number) => void;
  resume: (sequenceId: number) => void;
  snooze: (sequenceId: number) => void;
  stop: (sequenceId: number) => void;
  refreshTodayStats: () => Promise<void>;
  todayStats: { breaks_taken: number; movement_bonus_minutes: number };
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [engineState, setEngineState] = useState<TimerEngineState>(TimerEngine.getState());
  const [todayStats, setTodayStats] = useState({ breaks_taken: 0, movement_bonus_minutes: 0 });

  const refreshTodayStats = useCallback(async () => {
    const { getTodayStats } = await import('../db/stats');
    setTodayStats(await getTodayStats());
  }, []);

  useEffect(() => {
    (async () => {
      await TimerEngine.loadPersistedState(getSequenceById, getTimersBySequenceId);
      const s = TimerEngine.getState();
      for (const run of s.runs) {
        if (run.status === 'running' && run.timers[run.currentTimerIndex]) {
          const t = run.timers[run.currentTimerIndex];
          await NotifService.scheduleTimerEnd(run.sequence.id, run.remainingSeconds, t.type, t.label);
        }
      }
      await refreshTodayStats();
      Scheduler.startScheduler();
    })();
    return () => Scheduler.stopScheduler();
  }, [refreshTodayStats]);

  useEffect(() => {
    NotifService.setupNotifications();
    TimerEngine.setNotificationFns(
      (seqId, seconds, type, label) => NotifService.scheduleTimerEnd(seqId, seconds, type, label),
      (seqId) => NotifService.cancelScheduled(seqId)
    );
    TimerEngine.setOnTimerEnd((payload) => {
      playTimerEndSound((payload.soundId as TimerSoundId) ?? undefined);
      NotifService.fireTimerEndNow(payload.type, payload.label, payload.nextLabel).catch(() => {});
    });

    return () => {
      TimerEngine.setNotificationFns(null, null);
      TimerEngine.setOnTimerEnd(null);
    };
  }, []);

  useEffect(() => {
    const api = (window as unknown as {
      electronAPI?: {
        setTrayStateGetter: (fn: () => object) => void;
        sendTrayState: (s: object) => void;
      };
    }).electronAPI;

    const toTrayState = (runs: RunState[]) => {
      return {
        runs: runs.map((run) => {
          const current = run?.timers[run.currentTimerIndex];
          return {
            status: run.status,
            label: current?.label ?? '',
            type: current?.type ?? 'work',
            remainingSeconds: run.remainingSeconds,
            sequenceName: run.sequence?.name ?? '',
            sequenceId: run.sequence?.id ?? null,
          };
        }),
      };
    };

    if (api) {
      api.setTrayStateGetter(() => toTrayState(TimerEngine.getState().runs));

      let lastRunsCount = 0;
      let lastSendAt = 0;
      const TRAY_UPDATE_INTERVAL_MS = 60_000;
      const TRAY_UPDATE_WHEN_RUNNING_MS = 1000;

      const unsub = TimerEngine.subscribe((state) => {
        setEngineState(state);
        if (!api.sendTrayState) return;
        const now = Date.now();
        const runsChanged = state.runs.length !== lastRunsCount;
        const hasActiveRuns = state.runs.length > 0;
        const stale = hasActiveRuns && now - lastSendAt >= TRAY_UPDATE_INTERVAL_MS;
        const runningSync =
          hasActiveRuns && now - lastSendAt >= TRAY_UPDATE_WHEN_RUNNING_MS;
        if (runsChanged || stale || runningSync) {
          lastRunsCount = state.runs.length;
          lastSendAt = now;
          api.sendTrayState(toTrayState(state.runs));
        }
      });

      api.sendTrayState(toTrayState(TimerEngine.getState().runs));
      return unsub;
    }

    const unsub = TimerEngine.subscribe((state) => setEngineState(state));
    return unsub;
  }, []);

  const value: TimerContextValue = {
    ...engineState,
    start: useCallback((seq, timers) => TimerEngine.start(seq, timers), []),
    pause: useCallback((seqId) => TimerEngine.pause(seqId), []),
    resume: useCallback((seqId) => TimerEngine.resume(seqId), []),
    snooze: useCallback((seqId) => TimerEngine.snooze(seqId), []),
    stop: useCallback((seqId) => TimerEngine.stop(seqId), []),
    refreshTodayStats,
    todayStats,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
