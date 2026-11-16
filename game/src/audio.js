// Sound, synthesized live with WebAudio — no audio files, no network. Every sound is
// a short oscillator or noise burst with an envelope, so the game stays a set of
// static files. Audio starts only after the player's first gesture (the browser's
// autoplay rule) and can be muted with M.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },
    shoot() { tone(720, 0.07, 'square', 0.10, 340); },
    hit() { tone(220, 0.05, 'triangle', 0.12, 160); },
    die() { noise(0.16, 0.22, 900); tone(180, 0.14, 'sawtooth', 0.10, 60); },
    pickup() { tone(1180, 0.08, 'sine', 0.10, 1560); },
    hurt() { noise(0.22, 0.30, 500); tone(140, 0.25, 'sawtooth', 0.16, 55); },
    beaconHurt() { tone(98, 0.3, 'square', 0.16, 70); },
    dash() { noise(0.12, 0.14, 2400); },
    waveClear() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.12), i * 90)); },
    win() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'triangle', 0.12), i * 110)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.11), i * 140)); },
    click() { tone(880, 0.05, 'sine', 0.10, 990); },
    upgrade() { [660, 880, 990].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.11), i * 70)); },
  };
}
