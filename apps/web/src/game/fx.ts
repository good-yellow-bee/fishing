let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabledFlag = true;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = enabledFlag ? 1 : 0;
    master.connect(ctx.destination);
  }
  // Recover from suspension (e.g. iOS Safari audio interruption).
  if (ctx.state !== "running") void ctx.resume();
  return ctx;
}

function bus() {
  audio();
  return master!;
}

function noise() {
  const ac = audio();
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function noiseBurst(
  filterType: BiquadFilterType,
  freqFrom: number,
  freqTo: number,
  duration: number,
  gain: number,
  when = 0
) {
  const ac = audio();
  const t = ac.currentTime + when;
  const src = ac.createBufferSource();
  src.buffer = noise();
  const f = ac.createBiquadFilter();
  f.type = filterType;
  f.Q.value = 1;
  f.frequency.setValueAtTime(freqFrom, t);
  f.frequency.exponentialRampToValueAtTime(freqTo, t + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(f).connect(g).connect(bus());
  src.start(t);
  src.stop(t + duration);
}

function tone(
  type: OscillatorType,
  freqFrom: number,
  freqTo: number,
  duration: number,
  gain: number,
  when = 0,
  detune = 0
) {
  const ac = audio();
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freqFrom, t);
  osc.frequency.exponentialRampToValueAtTime(freqTo, t + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(bus());
  osc.start(t);
  osc.stop(t + duration);
}

function waterPlop(size: number) {
  tone("sine", 260 * size, 65, 0.12, 0.09 * size);
  noiseBurst("bandpass", 1800, 700, 0.16, 0.02 * size, 0.02);
}

let lapSrc: AudioBufferSourceNode | null = null;
let lapLfo: OscillatorNode | null = null;
let lapGain: GainNode | null = null;
let birdTimer = 0;

function chirp() {
  const base = 2000 + Math.random() * 1400;
  tone("sine", base, base * 1.5, 0.09, 0.012);
  tone("sine", base * 1.2, base * 1.9, 0.08, 0.01, 0.13);
  birdTimer = window.setTimeout(chirp, 2000 + Math.random() * 2000);
}

const ambient = {
  start() {
    if (lapSrc) return;
    const ac = audio();
    lapSrc = ac.createBufferSource();
    lapSrc.buffer = noise();
    lapSrc.loop = true;
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    lapGain = ac.createGain();
    lapGain.gain.value = 0.008;
    lapLfo = ac.createOscillator();
    lapLfo.frequency.value = 0.13;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 0.005;
    lapLfo.connect(lfoDepth).connect(lapGain.gain);
    lapSrc.connect(f).connect(lapGain).connect(bus());
    lapSrc.start();
    lapLfo.start();
    birdTimer = window.setTimeout(chirp, 2000 + Math.random() * 2000);
  },
  stop() {
    if (!lapSrc) return;
    window.clearTimeout(birdTimer);
    lapSrc.stop();
    lapLfo!.stop();
    lapGain!.disconnect();
    lapSrc = null;
    lapLfo = null;
    lapGain = null;
  },
};

export const fx = {
  get enabled() {
    return enabledFlag;
  },
  set enabled(v: boolean) {
    enabledFlag = v;
    if (ctx && master) master.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, 0.01);
  },
  ambient,
  cast() {
    ambient.start();
    if (!this.enabled) return;
    noiseBurst("bandpass", 2800, 300, 0.25, 0.05);
  },
  splash() {
    if (this.enabled) waterPlop(1.4);
  },
  plop() {
    if (this.enabled) waterPlop(1);
  },
  bite() {
    if (!this.enabled) return;
    tone("sine", 880, 900, 0.07, 0.035);
    tone("sine", 1320, 1350, 0.07, 0.035, 0.09);
  },
  reel() {
    if (!this.enabled) return;
    noiseBurst("bandpass", 2200 * (0.9 + Math.random() * 0.2), 1500, 0.03, 0.02);
  },
  surge() {
    if (!this.enabled) return;
    const ac = audio();
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    const g = ac.createGain();
    const t = ac.currentTime;
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    f.connect(g).connect(bus());
    for (const d of [-8, 8]) {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(55, t);
      osc.detune.value = d;
      osc.connect(f);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  },
  snap() {
    if (!this.enabled) return;
    noiseBurst("highpass", 2500, 900, 0.07, 0.07);
    tone("sine", 90, 45, 0.22, 0.07, 0.02);
  },
  land() {
    if (!this.enabled) return;
    const notes = [659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      tone("triangle", n, n, 0.2, 0.04, i * 0.16, 4);
      tone("triangle", n, n, 0.2, 0.02, i * 0.16, -4);
    });
  },
};
