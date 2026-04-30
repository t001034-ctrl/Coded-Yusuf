let audioCtx: AudioContext | null = null;

export function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function makeNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const buf = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * durationSec),
    ctx.sampleRate,
  );
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

export function playCheer(): void {
  const ctx = ensureCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 1.6;

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, dur);

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1200;
  bp.Q.value = 0.7;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.55, now + 0.25);
  noiseGain.gain.exponentialRampToValueAtTime(0.35, now + 0.9);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(bp).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur);

  // Bright C-major triad: C5, E5, G5
  const freqs = [523.25, 659.25, 783.99];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.05, now + 0.6);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.16, now + 0.08 + i * 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.3);
  });

  // Whistle chirps
  for (let i = 0; i < 3; i++) {
    const t0 = now + 0.15 + Math.random() * 0.7;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    const startF = 1800 + Math.random() * 600;
    osc.frequency.setValueAtTime(startF, t0);
    osc.frequency.exponentialRampToValueAtTime(startF * 1.4, t0 + 0.18);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.35);
  }
}

export function playGroan(): void {
  const ctx = ensureCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 1.4;

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, dur);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(800, now);
  lp.frequency.exponentialRampToValueAtTime(220, now + dur);
  lp.Q.value = 0.6;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.45, now + 0.2);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(lp).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur);

  const sigh = (
    startFreq: number,
    endFreq: number,
    gainPeak: number,
    delay: number,
  ): void => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    const t0 = now + delay;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + 1.0);

    const lp2 = ctx.createBiquadFilter();
    lp2.type = "lowpass";
    lp2.frequency.value = 900;

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);

    osc.connect(lp2).connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 1.3);
  };
  sigh(220.0, 164.81, 0.1, 0.05); // A3 -> E3
  sigh(261.63, 196.0, 0.08, 0.05); // C4 -> G3
}
