// Skylark Courier — synthesised sound, no audio files.
// Engine drone, wind rush, ring chimes and thuds, all from oscillators
// and filtered noise, so the game ships no samples at all.

export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineOsc2 = null;
  let windSrc = null, windGain = null, windFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 110;
      const engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();

      const noiseLen = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i += 1) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = noiseBuf;
      windSrc.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSrc.start();
      started = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted: () => muted,
    // Called every frame while flying: rpm 0..1, airspeed m/s.
    engine(rpm, speed, airborne) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const base = 42 + rpm * 68;
      engineOsc.frequency.setTargetAtTime(base, t, 0.08);
      engineOsc2.frequency.setTargetAtTime(base * 2.02, t, 0.08);
      windFilter.frequency.setTargetAtTime(300 + speed * 9, t, 0.1);
      windGain.gain.setTargetAtTime(airborne ? 0.02 + speed * 0.0011 : 0.0, t, 0.15);
    },
    ring(centre) {
      tone(660, 0.35, 'sine', 0.22);
      tone(880, 0.4, 'sine', 0.2, 0.07);
      if (centre) tone(1320, 0.5, 'sine', 0.18, 0.14);
    },
    warning() { tone(220, 0.16, 'square', 0.10); },
    thud() {
      tone(70, 0.3, 'sine', 0.4);
      tone(48, 0.4, 'sine', 0.3, 0.03);
    },
    crash() {
      if (!ctx || muted) return;
      const t0 = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = windSrc.buffer;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + 0.85);
      tone(55, 0.7, 'sine', 0.4);
    },
    click() { tone(520, 0.08, 'sine', 0.12); },
  };
}
