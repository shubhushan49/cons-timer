
let audio: HTMLAudioElement | null = null;

export type TimerSoundId =
  | 'chimes'
  | 'soft_bell'
  | 'gentle'
  | 'wind_chime'
  | 'soft_harp'
  | 'singing_bowl'
  | 'morning_bell'
  | 'crystal'
  | 'soft_ding'
  | 'warm_tone'
  | 'custom';

export const TIMER_SOUND_OPTIONS: { id: TimerSoundId; label: string }[] = [
  { id: 'chimes', label: 'Chimes' },
  { id: 'soft_bell', label: 'Soft bell' },
  { id: 'gentle', label: 'Gentle tone' },
  { id: 'wind_chime', label: 'Wind chime' },
  { id: 'soft_harp', label: 'Soft harp' },
  { id: 'singing_bowl', label: 'Singing bowl' },
  { id: 'morning_bell', label: 'Morning bell' },
  { id: 'crystal', label: 'Crystal' },
  { id: 'soft_ding', label: 'Soft ding' },
  { id: 'warm_tone', label: 'Warm tone' },
  { id: 'custom', label: 'Custom (alarm.wav)' },
];

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new Ctx();
  } catch {
    return null;
  }
}

function playChimes(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freq = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  freq.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = f;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    osc.start(t);
    osc.stop(t + 0.85);
  });
}

function playSoftBell(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 587.33; // D5
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.25);
}

function playGentle(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 523.25; // C5
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.65);
}

function playWindChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freq = [659.25, 523.25, 392, 523.25, 659.25]; // E5, C5, G4
  freq.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = f;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 1.2);
    osc.start(t);
    osc.stop(t + 1.25);
  });
}

function playSoftHarp(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freq = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6 arpeggio
  freq.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = f;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}

function playSingingBowl(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 293.66; // D4, low and meditative
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 2.6);
}

function playMorningBell(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freq = [523.25, 659.25, 783.99]; // C5-E5-G5 ascending
  freq.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = f;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.9);
    osc.start(t);
    osc.stop(t + 0.95);
  });
}

function playCrystal(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freq = [2093, 2637, 3136]; // High C7-C7#-G7 shimmer
  freq.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = f;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.06;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.7);
    osc.start(t);
    osc.stop(t + 0.75);
  });
}

function playSoftDing(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  [523.25, 659.25].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = f;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.25;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.start(t);
    osc.stop(t + 0.65);
  });
}

function playWarmTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 392; // G4, warm and mellow
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.05);
}

async function playCustom(): Promise<boolean> {
  try {
    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }
    const alarmUrl = (import.meta.env.BASE_URL || './') + 'alarm.wav';
    const a = new Audio(alarmUrl);
    a.volume = 0.8;
    await a.play();
    audio = a;
    a.onended = () => { audio = null; };
    return true;
  } catch {
    return false;
  }
}

export async function playTimerEndSound(overrideId?: TimerSoundId | null): Promise<void> {
  const soundId = (overrideId && TIMER_SOUND_OPTIONS.some((o) => o.id === overrideId) ? overrideId : 'chimes') as TimerSoundId;

  if (soundId === 'custom') {
    const ok = await playCustom();
    if (!ok) playGentle(); // fallback if alarm.wav missing
    return;
  }

  switch (soundId) {
    case 'chimes':
      playChimes();
      break;
    case 'soft_bell':
      playSoftBell();
      break;
    case 'gentle':
      playGentle();
      break;
    case 'wind_chime':
      playWindChime();
      break;
    case 'soft_harp':
      playSoftHarp();
      break;
    case 'singing_bowl':
      playSingingBowl();
      break;
    case 'morning_bell':
      playMorningBell();
      break;
    case 'crystal':
      playCrystal();
      break;
    case 'soft_ding':
      playSoftDing();
      break;
    case 'warm_tone':
      playWarmTone();
      break;
    default:
      playGentle();
      break;
  }
}

export async function stopSound(): Promise<void> {
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
  }
}
