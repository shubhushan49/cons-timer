import { useEffect } from 'react';
import { useTimer } from '../context/TimerContext';

export default function IpcTimerActionListener() {
  const timer = useTimer();

  useEffect(() => {
    const api = (window as unknown as {
      electronAPI?: {
        onTimerPause?: (cb: (id: number) => void) => (() => void) | void;
        onTimerSnooze?: (cb: (id: number) => void) => (() => void) | void;
        onTimerStop?: (cb: (id: number) => void) => (() => void) | void;
        onTimerResume?: (cb: (id: number) => void) => (() => void) | void;
      };
    }).electronAPI;

    if (!api) return;

    const cleanups: (() => void)[] = [];
    if (api.onTimerPause) cleanups.push(api.onTimerPause((id) => timer.pause(id)) ?? (() => {}));
    if (api.onTimerSnooze) cleanups.push(api.onTimerSnooze((id) => timer.snooze(id)) ?? (() => {}));
    if (api.onTimerStop) cleanups.push(api.onTimerStop((id) => timer.stop(id)) ?? (() => {}));
    if (api.onTimerResume) cleanups.push(api.onTimerResume((id) => timer.resume(id)) ?? (() => {}));
    return () => cleanups.forEach((c) => c());
  }, [timer]);

  return null;
}
