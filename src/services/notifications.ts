const timerEndScheduled = new Map<number, ReturnType<typeof setTimeout>>();
const electronScheduled = new Map<string, ReturnType<typeof setTimeout>>();

function showNotification(title: string, body: string): void {
  const api = (window as unknown as { electronAPI?: { showNotification: (t: string, b: string) => void } }).electronAPI;
  if (api?.showNotification) {
    api.showNotification(title, body);
    return;
  }
  if (typeof Notification !== 'undefined') {
    new Notification(title, { body });
  }
}

export async function setupNotifications(): Promise<void> {
  // Electron doesn't need requestPermission for main-process notifications
  if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: unknown }).electronAPI) return;
  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    await Notification.requestPermission();
  }
}

export async function scheduleTimerEnd(
  sequenceId: number,
  secondsFromNow: number,
  type: 'break' | 'work',
  label: string
): Promise<void> {
  await cancelScheduled(sequenceId);
  if (secondsFromNow <= 0) return;
  const title = type === 'break' ? 'Time to Move!' : 'Work session over';
  const body = type === 'break' ? `${label} – Stretch now!` : 'Take a break.';

  const id = setTimeout(() => {
    showNotification(title, body);
    timerEndScheduled.delete(sequenceId);
  }, secondsFromNow * 1000);
  timerEndScheduled.set(sequenceId, id);
}

export async function fireTimerEndNow(
  type: 'break' | 'work',
  label: string,
  nextLabel?: string
): Promise<void> {
  const title = type === 'break' ? 'Break is over' : 'Work session complete';
  const body = nextLabel ? `Next up: ${nextLabel}` : 'Sequence finished.';
  showNotification(title, body);
}

export async function cancelScheduled(sequenceId: number): Promise<void> {
  const id = timerEndScheduled.get(sequenceId);
  if (id != null) {
    clearTimeout(id);
    timerEndScheduled.delete(sequenceId);
  }
}

export async function scheduleStartTimeNotification(
  sequenceId: number,
  sequenceName: string,
  startTimeMinutes: number
): Promise<void> {
  const tag = `start-time-${sequenceId}`;

  const existing = electronScheduled.get(tag);
  if (existing) clearTimeout(existing);
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(Math.floor(startTimeMinutes / 60), startTimeMinutes % 60, 0, 0);
  if (targetDate.getTime() <= now.getTime()) targetDate.setDate(targetDate.getDate() + 1);
  const msUntil = Math.max(1000, targetDate.getTime() - now.getTime());
  const id = setTimeout(() => {
    showNotification('Time to start ' + sequenceName, 'Open Pomodoro Flex to start your sequence.');
    electronScheduled.delete(tag);
  }, msUntil);
  electronScheduled.set(tag, id);
}

export async function scheduleAllStartTimeNotifications(): Promise<void> {
  const { getSequences } = await import('../db/sequences');
  try {
    const sequences = await getSequences();
    for (const seq of sequences) {
      if ((seq.enabled ?? 1) === 1 && seq.start_time != null) {
        await scheduleStartTimeNotification(seq.id, seq.name, seq.start_time);
      }
    }
  } catch (e) {
    console.warn('[Notif] Failed to schedule start-time notifications:', e);
  }
}

export async function cancelStartTimeNotification(sequenceId: number): Promise<void> {
  const tag = `start-time-${sequenceId}`;
  const id = electronScheduled.get(tag);
  if (id) {
    clearTimeout(id);
    electronScheduled.delete(tag);
  }
}

export async function scheduleEndTimeNotification(
  sequenceId: number,
  sequenceName: string,
  endTimeMinutes: number
): Promise<void> {
  const tag = `end-time-${sequenceId}`;
  const existing = electronScheduled.get(tag);
  if (existing) clearTimeout(existing);
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(Math.floor(endTimeMinutes / 60), endTimeMinutes % 60, 0, 0);
  if (targetDate.getTime() <= now.getTime()) return;
  const msUntil = Math.max(1000, targetDate.getTime() - now.getTime());
  const id = setTimeout(() => {
    showNotification(sequenceName + ' schedule ended', 'Auto-stopping the sequence.');
    electronScheduled.delete(tag);
  }, msUntil);
  electronScheduled.set(tag, id);
}

export async function cancelEndTimeNotification(sequenceId: number): Promise<void> {
  const tag = `end-time-${sequenceId}`;
  const id = electronScheduled.get(tag);
  if (id) {
    clearTimeout(id);
    electronScheduled.delete(tag);
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}
