import type { LakeHour, Sky } from "@stillwater/shared";

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
let rainSrc: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;
let wildlifeTimer = 0;
let melodyTimer = 0;
let ambientHour: LakeHour = "day";
let ambientSky: Sky = "clear";

export function ambientProfile(hour: LakeHour, sky: Sky) {
  return {
    rain: sky === "rain",
    wildlife: hour === "night" ? "crickets" : "birds",
    melody: hour === "night" ? [220, 261.63, 293.66] : [329.63, 392, 493.88],
  } as const;
}

function chirp() {
  if (!lapSrc) return;
  if (ambientProfile(ambientHour, ambientSky).wildlife === "crickets") {
    const base = 3600 + Math.random() * 700;
    tone("square", base, base * 0.96, 0.035, 0.003);
    tone("square", base * 1.06, base, 0.025, 0.002, 0.07);
    wildlifeTimer = window.setTimeout(chirp, 180 + Math.random() * 420);
    return;
  }
  const base = 2000 + Math.random() * 1400;
  tone("sine", base, base * 1.5, 0.09, 0.012);
  tone("sine", base * 1.2, base * 1.9, 0.08, 0.01, 0.13);
  wildlifeTimer = window.setTimeout(chirp, 2000 + Math.random() * 2000);
}

function playMelody() {
  if (!lapSrc) return;
  const notes = ambientProfile(ambientHour, ambientSky).melody;
  const start = Math.floor(Math.random() * notes.length);
  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[(start + i) % notes.length]!;
    tone("sine", note, note, 0.7, 0.006, i * 0.62);
  }
  melodyTimer = window.setTimeout(playMelody, 9200 + Math.random() * 4200);
}

function startRain() {
  if (rainSrc || ambientSky !== "rain") return;
  const ac = audio();
  rainSrc = ac.createBufferSource();
  rainSrc.buffer = noise();
  rainSrc.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1200;
  rainGain = ac.createGain();
  rainGain.gain.value = 0.0035;
  rainSrc.connect(filter).connect(rainGain).connect(bus());
  rainSrc.start();
}

function stopRain() {
  if (!rainSrc) return;
  rainSrc.stop();
  rainGain?.disconnect();
  rainSrc = null;
  rainGain = null;
}

function restartAmbientTimers() {
  window.clearTimeout(wildlifeTimer);
  window.clearTimeout(melodyTimer);
  if (lapSrc) {
    wildlifeTimer = window.setTimeout(chirp, ambientHour === "night" ? 300 : 2000 + Math.random() * 2000);
    melodyTimer = window.setTimeout(playMelody, 4000 + Math.random() * 3000);
  }
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
    startRain();
    restartAmbientTimers();
  },
  setConditions(hour: LakeHour, sky: Sky) {
    const changed = ambientHour !== hour || ambientSky !== sky;
    ambientHour = hour;
    ambientSky = sky;
    if (!changed || !lapSrc) return;
    stopRain();
    startRain();
    restartAmbientTimers();
  },
  stop() {
    if (!lapSrc) return;
    window.clearTimeout(wildlifeTimer);
    window.clearTimeout(melodyTimer);
    lapSrc.stop();
    lapLfo!.stop();
    lapGain!.disconnect();
    stopRain();
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
  nibble() {
    if (!this.enabled) return;
    tone("sine", 640, 580, 0.05, 0.02);
    waterPlop(0.45);
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
