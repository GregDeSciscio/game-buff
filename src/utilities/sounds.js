let audioContext;

const getContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const playTone = ({ frequency = 440, duration = 0.08, type = 'sine', volume = 0.2 }) => {
  const ctx = getContext();
  const now = ctx.currentTime;

  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
};

export const playClick = () => {
  playTone({ frequency: 220, duration: 0.05, type: 'square', volume: 0.15 });
};

export const playTimerComplete = () => {
  const ctx = getContext();
  const now = ctx.currentTime;

  const freqs = [440, 660, 880];
  freqs.forEach((frequency, idx) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now + idx * 0.03);

    const gain = ctx.createGain();
    const startTime = now + idx * 0.03;
    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.3);
  });
};
