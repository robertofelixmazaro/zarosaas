export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(587, now, 0.15);       // D5
    playTone(784, now + 0.15, 0.15); // G5
    playTone(880, now + 0.3, 0.25);  // A5
  } catch {
    // Audio not available
  }
}

export function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(523, now, 0.12);        // C5
    playTone(659, now + 0.13, 0.12); // E5
    playTone(784, now + 0.26, 0.12); // G5
    playTone(1047, now + 0.39, 0.2); // C6
  } catch {
    // Audio not available
  }
}

export function playUrgentReminderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number, vol = 0.35) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    // Urgent double-beep pattern
    playTone(1047, now, 0.12);        // C6
    playTone(1319, now + 0.13, 0.12); // E6
    playTone(1047, now + 0.35, 0.12); // C6
    playTone(1319, now + 0.48, 0.15); // E6
  } catch {
    // Audio not available
  }
}
