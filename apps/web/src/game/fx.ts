import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import type { DragTone } from "./dragTone";
import { captionSound } from "./soundCaptions";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabledFlag = true;
let volumeLevel = 1;
let nature: GainNode | null = null;
let natureLevel = 1;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = enabledFlag ? volumeLevel : 0;
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

/** The lake's own sounds (water, wildlife, rain, wind, thunder) run through here, under the master, so they have a level of their own. */
function natureBus() {
  const ac = audio();
  if (!nature) {
    nature = ac.createGain();
    nature.gain.value = natureLevel;
    nature.connect(master!);
  }
  return nature;
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
  when = 0,
  out: AudioNode = bus(),
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
  src.connect(f).connect(g).connect(out);
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
  detune = 0,
  out: AudioNode = bus(),
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
  osc.connect(g).connect(out);
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
let loonTimer = 0;
let windSrc: AudioBufferSourceNode | null = null;
let windLfo: OscillatorNode | null = null;
let windGain: GainNode | null = null;
let geeseTimer = 0;
let frogTimer = 0;
let owlTimer = 0;
let woodpeckerTimer = 0;
let ambientHour: LakeHour = "day";
let ambientSky: Sky = "clear";
let ambientSeason: LakeSeason = "summer";

export type Wildlife = "birds" | "chorus" | "crickets" | "chickadees" | "quiet";

/**
 * What the shore sounds like. Crickets and loons go quiet in winter, when a
 * chickadee calls by day and the wind moves over the ice; geese pass over in fall.
 */
export function ambientProfile(hour: LakeHour, sky: Sky, season: LakeSeason = "summer") {
  const night = hour === "night";
  const winter = season === "winter";
  // Spring and summer dawns, unless it rains, get the full chorus.
  const chorus = hour === "dawn" && (season === "spring" || season === "summer") && sky !== "rain";
  const wildlife: Wildlife = winter ? (night ? "quiet" : "chickadees") : night ? "crickets" : chorus ? "chorus" : "birds";
  return {
    wildlife,
    loons: night && !winter,
    // Winter rain falls as snow, which makes no hiss.
    rain: sky === "rain" && !winter,
    geese: season === "fall" && !night && sky !== "rain",
    // Peepers and green frogs call from the reeds on warm evenings, rain or not.
    frogs: (hour === "dusk" || hour === "night") && (season === "spring" || season === "summer"),
    wind: winter,
    // The owl on the far bank calls through the night, all but winter.
    owls: night && !winter,
    // A woodpecker drums in the woods on dry mornings and days, all but winter.
    woodpecker: (hour === "dawn" || hour === "day") && !winter && sky !== "rain",
  };
}

function profile() {
  return ambientProfile(ambientHour, ambientSky, ambientSeason);
}

/** One bird of the dawn chorus: a falling warble, a quick trill, or the day's two-note call, each panned nowhere in particular. */
function chorusSong(kind: number) {
  const base = 1900 + Math.random() * 1800;
  const quiet = 0.005 + Math.random() * 0.006;
  if (kind === 0) {
    for (let n = 0; n < 4; n += 1) tone("sine", base * (1.25 - n * 0.08), base * (1.1 - n * 0.08), 0.11, quiet, n * 0.14, 0, natureBus());
  } else if (kind === 1) {
    for (let n = 0; n < 7; n += 1) tone("sine", base * 1.4, base * 1.3, 0.035, quiet * 0.8, n * 0.05, 0, natureBus());
  } else {
    tone("sine", base, base * 1.5, 0.09, quiet, 0, 0, natureBus());
    tone("sine", base * 1.2, base * 1.9, 0.08, quiet * 0.85, 0.13, 0, natureBus());
  }
}

function chirp() {
  if (!lapSrc) return;
  const { wildlife } = profile();
  if (wildlife === "quiet") return;
  if (wildlife === "chickadees") {
    // "Fee-bee": a clean high whistle, then one a step lower.
    const base = 3900 + Math.random() * 300;
    tone("sine", base, base * 0.98, 0.32, 0.009, 0, 0, natureBus());
    tone("sine", base * 0.84, base * 0.82, 0.36, 0.008, 0.42, 0, natureBus());
    wildlifeTimer = window.setTimeout(chirp, 4000 + Math.random() * 5000);
    return;
  }
  if (wildlife === "crickets") {
    const base = 3600 + Math.random() * 700;
    tone("square", base, base * 0.96, 0.035, 0.003, 0, 0, natureBus());
    tone("square", base * 1.06, base, 0.025, 0.002, 0.07, 0, natureBus());
    wildlifeTimer = window.setTimeout(chirp, 180 + Math.random() * 420);
    return;
  }
  if (wildlife === "chorus") {
    chorusSong(Math.floor(Math.random() * 3));
    wildlifeTimer = window.setTimeout(chirp, 250 + Math.random() * 550);
    return;
  }
  const base = 2000 + Math.random() * 1400;
  tone("sine", base, base * 1.5, 0.09, 0.012, 0, 0, natureBus());
  tone("sine", base * 1.2, base * 1.9, 0.08, 0.01, 0.13, 0, natureBus());
  wildlifeTimer = window.setTimeout(chirp, 2000 + Math.random() * 2000);
}

const owlListeners = new Set<() => void>();

/** Runs `listener` each time the owl hoots; returns the unsubscribe. */
export function onOwlHoot(listener: () => void) {
  owlListeners.add(listener);
  return () => {
    owlListeners.delete(listener);
  };
}

/** One soft, breathy note: swells in and dies away, unlike tone()'s plucked start. */
function hootNote(freq: number, duration: number, gain: number, when: number) {
  const ac = audio();
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + duration * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(natureBus());
  osc.start(t);
  osc.stop(t + duration);
}

/** The owl's "hoo, hoo-hoo" from across the water, low and soft. */
function owlCall() {
  if (!lapSrc || !profile().owls) return;
  const base = 360 + Math.random() * 40;
  hootNote(base, 0.42, 0.03, 0);
  hootNote(base * 0.95, 0.28, 0.024, 0.62);
  hootNote(base * 0.95, 0.36, 0.026, 0.95);
  for (const listener of owlListeners) listener();
  captionSound("owl");
  owlTimer = window.setTimeout(owlCall, 16000 + Math.random() * 16000);
}

/** Where the visible loon is for the listener; the scene keeps it current. */
const loonPlace = { pan: 0, gain: 1 };
const loonListeners = new Set<() => void>();

/** Runs `listener` each time the loon calls; returns the unsubscribe. */
export function onLoonCall(listener: () => void) {
  loonListeners.add(listener);
  return () => {
    loonListeners.delete(listener);
  };
}

/** A loon's wail across the water: a slow rise, a held note, then a fall, from where the loon is. */
function loonCall() {
  if (!lapSrc || !profile().loons) return;
  const ac = audio();
  const level = ac.createGain();
  level.gain.value = Math.max(0.35, Math.min(1.6, loonPlace.gain * 2));
  const out: AudioNode = level;
  if (typeof ac.createStereoPanner === "function") {
    const panner = ac.createStereoPanner();
    panner.pan.value = loonPlace.pan;
    level.connect(panner);
    panner.connect(natureBus());
  } else {
    level.connect(natureBus());
  }
  const base = 520 + Math.random() * 80;
  tone("sine", base, base * 1.5, 0.9, 0.012, 0, 0, out);
  tone("sine", base * 1.5, base * 1.45, 1.1, 0.01, 0.85, 0, out);
  tone("sine", base * 1.45, base * 1.1, 0.8, 0.008, 1.9, 0, out);
  window.setTimeout(() => level.disconnect(), 3000);
  for (const listener of loonListeners) listener();
  captionSound("loon");
  loonTimer = window.setTimeout(loonCall, 14000 + Math.random() * 12000);
}

function startRain() {
  if (rainSrc || !profile().rain) return;
  const ac = audio();
  rainSrc = ac.createBufferSource();
  rainSrc.buffer = noise();
  rainSrc.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1200;
  rainGain = ac.createGain();
  rainGain.gain.value = 0.0035;
  rainSrc.connect(filter).connect(rainGain).connect(natureBus());
  rainSrc.start();
}

function stopRain() {
  if (!rainSrc) return;
  rainSrc.stop();
  rainGain?.disconnect();
  rainSrc = null;
  rainGain = null;
}

const geeseListeners = new Set<() => void>();

/** Runs `listener` each time the geese honk going over; returns the unsubscribe. */
export function onGeeseCall(listener: () => void) {
  geeseListeners.add(listener);
  return () => {
    geeseListeners.delete(listener);
  };
}

/** A skein of geese going over: a few honks, each a short nasal drop, a little ragged. */
function geeseCall() {
  if (!lapSrc || !profile().geese) return;
  const honks = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < honks; i++) {
    const base = 300 + Math.random() * 60;
    tone("sawtooth", base, base * 0.86, 0.16, 0.0035, i * (0.28 + Math.random() * 0.2), 0, natureBus());
  }
  for (const listener of geeseListeners) listener();
  captionSound("geese");
  geeseTimer = window.setTimeout(geeseCall, 18000 + Math.random() * 16000);
}

/** Seconds into a drum roll that each knock lands: a quick burst that slows a touch toward its end. */
export function drumKnocks(count: number) {
  const out: number[] = [];
  let at = 0;
  for (let i = 0; i < count; i += 1) {
    out.push(at);
    at += 0.05 + (i / count) * 0.025;
  }
  return out;
}

/** A woodpecker drumming on a dead trunk back in the woods: a fast roll of dry knocks, fading as it goes. */
function woodpeckerCall() {
  if (!lapSrc || !profile().woodpecker) return;
  const knocks = drumKnocks(12 + Math.floor(Math.random() * 8));
  const pitch = 700 + Math.random() * 300;
  knocks.forEach((at, i) => {
    const fade = 1 - (i / knocks.length) * 0.6;
    noiseBurst("bandpass", pitch * 1.4, pitch, 0.03, 0.02 * fade, at, natureBus());
  });
  captionSound("woodpecker");
  woodpeckerTimer = window.setTimeout(woodpeckerCall, 22000 + Math.random() * 20000);
}

/** The reed bank at dusk: a run of spring peepers (short rising whistles), now and then a green frog's low banjo "gunk". */
function frogCall() {
  if (!lapSrc || !profile().frogs) return;
  if (Math.random() < 0.3) {
    const base = 150 + Math.random() * 40;
    tone("triangle", base * 1.15, base, 0.12, 0.012, 0, 0, natureBus());
  } else {
    const peeps = 2 + Math.floor(Math.random() * 4);
    const base = 2700 + Math.random() * 500;
    for (let i = 0; i < peeps; i++) tone("sine", base, base * 1.12, 0.07, 0.004, i * (0.32 + Math.random() * 0.1), 0, natureBus());
  }
  frogTimer = window.setTimeout(frogCall, 900 + Math.random() * 2200);
}

/** Winter wind: band-passed noise that swells and drops on a slow wobble. */
function startWind() {
  if (windSrc || !profile().wind) return;
  const ac = audio();
  windSrc = ac.createBufferSource();
  windSrc.buffer = noise();
  windSrc.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 520;
  windGain = ac.createGain();
  windGain.gain.value = 0.006;
  windLfo = ac.createOscillator();
  windLfo.frequency.value = 0.07;
  const depth = ac.createGain();
  depth.gain.value = 0.004;
  windLfo.connect(depth).connect(windGain.gain);
  windSrc.connect(filter).connect(windGain).connect(natureBus());
  windSrc.start();
  windLfo.start();
}

function stopWind() {
  if (!windSrc) return;
  windSrc.stop();
  windLfo?.stop();
  windGain?.disconnect();
  windSrc = null;
  windLfo = null;
  windGain = null;
}

function restartWildlife() {
  window.clearTimeout(wildlifeTimer);
  window.clearTimeout(loonTimer);
  window.clearTimeout(geeseTimer);
  window.clearTimeout(frogTimer);
  window.clearTimeout(owlTimer);
  window.clearTimeout(woodpeckerTimer);
  if (!lapSrc) return;
  const { wildlife, loons, geese, frogs, owls, woodpecker } = profile();
  if (wildlife !== "quiet") wildlifeTimer = window.setTimeout(chirp, wildlife === "crickets" || wildlife === "chorus" ? 300 : 2000 + Math.random() * 2000);
  if (loons) loonTimer = window.setTimeout(loonCall, 4000 + Math.random() * 6000);
  if (geese) geeseTimer = window.setTimeout(geeseCall, 6000 + Math.random() * 8000);
  if (frogs) frogTimer = window.setTimeout(frogCall, 1500 + Math.random() * 2000);
  if (owls) owlTimer = window.setTimeout(owlCall, 7000 + Math.random() * 8000);
  if (woodpecker) woodpeckerTimer = window.setTimeout(woodpeckerCall, 9000 + Math.random() * 10000);
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
    lapSrc.connect(f).connect(lapGain).connect(natureBus());
    lapSrc.start();
    lapLfo.start();
    startRain();
    startWind();
    restartWildlife();
  },
  /** The visible loon's place for the listener, so its call comes from where it swims. */
  setLoonPlace(pan: number, gain: number) {
    loonPlace.pan = pan;
    loonPlace.gain = gain;
  },
  /** Safe before the first cast: the sounds start on the first cast, with the latest conditions. */
  setConditions(hour: LakeHour, sky: Sky, season: LakeSeason = "summer") {
    if (ambientHour === hour && ambientSky === sky && ambientSeason === season) return;
    ambientHour = hour;
    ambientSky = sky;
    ambientSeason = season;
    if (!lapSrc) return;
    stopRain();
    startRain();
    stopWind();
    startWind();
    restartWildlife();
  },
  stop() {
    if (!lapSrc) return;
    window.clearTimeout(wildlifeTimer);
    window.clearTimeout(loonTimer);
    window.clearTimeout(geeseTimer);
    window.clearTimeout(frogTimer);
    window.clearTimeout(owlTimer);
    window.clearTimeout(woodpeckerTimer);
    lapSrc.stop();
    lapLfo!.stop();
    lapGain!.disconnect();
    stopRain();
    stopWind();
    lapSrc = null;
    lapLfo = null;
    lapGain = null;
  },
};

let dragOsc: OscillatorNode | null = null;
let dragGain: GainNode | null = null;
let dragFilter: BiquadFilterNode | null = null;
let lastRasp = 0;
let lastHiss = 0;

/** A continuous drag voice for the fight; `set` starts it, `stop` ends it with the fight. */
const drag = {
  set(next: DragTone) {
    if (!enabledFlag) {
      drag.stop();
      return;
    }
    const ac = audio();
    if (!dragOsc) {
      dragOsc = ac.createOscillator();
      dragOsc.type = "sawtooth";
      dragFilter = ac.createBiquadFilter();
      dragFilter.type = "bandpass";
      dragFilter.Q.value = 6;
      dragGain = ac.createGain();
      dragGain.gain.value = 0;
      dragOsc.connect(dragFilter).connect(dragGain).connect(bus());
      dragOsc.start();
    }
    const t = ac.currentTime;
    dragOsc.frequency.setTargetAtTime(next.hz, t, 0.05);
    dragFilter!.frequency.setTargetAtTime(next.hz * 2, t, 0.05);
    dragGain!.gain.setTargetAtTime(next.gain, t, 0.06);
    if (next.rasp && t - lastRasp > 0.33) {
      lastRasp = t;
      noiseBurst("bandpass", 3200, 1800, 0.05, 0.03);
    }
    if (next.hiss && t - lastHiss > 0.16) {
      lastHiss = t;
      noiseBurst("highpass", 5200, 4200, 0.18, 0.02);
    }
  },
  stop() {
    if (!dragOsc) return;
    dragOsc.stop();
    dragOsc.disconnect();
    dragGain!.disconnect();
    dragOsc = null;
    dragGain = null;
    dragFilter = null;
  },
  get playing() {
    return dragOsc !== null;
  },
};

/** A small brass rod bell: a struck tone with its inharmonic overtones, so it rings rather than beeps. */
export const BELL_PARTIALS = [1, 2.76, 5.4] as const;
export const BELL_PITCH = 1850;
/** Seconds after the first strike that each further strike lands: a nibble jingles twice, a bite rings hard. */
export const BELL_STRIKES = { jingle: [0, 0.11], ring: [0, 0.08, 0.17, 0.27, 0.38] } as const;
export type BellKind = keyof typeof BELL_STRIKES;

/** Buzz patterns in ms for phones that can vibrate (Android Chrome; iOS Safari has no vibrate). */
export const HAPTICS = {
  nibble: [15],
  bite: [40],
  strike: [50],
  surge: [30, 40, 30],
  snap: [80],
  land: [20, 30, 60],
} as const;

export type HapticBeat = keyof typeof HAPTICS;

export const fx = {
  get enabled() {
    return enabledFlag;
  },
  set enabled(v: boolean) {
    enabledFlag = v;
    if (ctx && master) master.gain.setTargetAtTime(v ? volumeLevel : 0, ctx.currentTime, 0.01);
  },
  /** Master volume, 0..1, under the mute switch. */
  get volume() {
    return volumeLevel;
  },
  set volume(v: number) {
    volumeLevel = Math.min(1, Math.max(0, v));
    if (ctx && master) master.gain.setTargetAtTime(enabledFlag ? volumeLevel : 0, ctx.currentTime, 0.01);
  },
  /** The lake's own sounds, 0..1, under the master volume. */
  get natureVolume() {
    return natureLevel;
  },
  set natureVolume(v: number) {
    natureLevel = Math.min(1, Math.max(0, v));
    if (ctx && nature) nature.gain.setTargetAtTime(natureLevel, ctx.currentTime, 0.01);
  },
  ambient,
  drag,
  /** Felt rather than heard, so it follows its own switch, not the sound. */
  hapticsEnabled: true,
  haptic(beat: HapticBeat) {
    if (!this.hapticsEnabled || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate([...HAPTICS[beat]]);
  },
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
  /** The rod-tip bell after dark: a soft jingle on a nibble, a hard ring on the bite. */
  rodBell(kind: BellKind) {
    if (!this.enabled) return;
    const loud = kind === "ring" ? 0.03 : 0.014;
    BELL_STRIKES[kind].forEach((when, strike) => {
      const pitch = BELL_PITCH * (1 + (strike % 2) * 0.012);
      BELL_PARTIALS.forEach((partial, i) => tone("sine", pitch * partial, pitch * partial * 0.998, 0.5 / (i + 1), loud / (i + 1.5), when));
    });
  },
  /** A spooked deer's snort from the far bank: two short, breathy blasts. Quiet until the lake's sounds have started. */
  snort() {
    if (!this.enabled || !lapSrc) return;
    noiseBurst("bandpass", 1100, 380, 0.16, 0.03, 0, natureBus());
    noiseBurst("bandpass", 950, 340, 0.12, 0.018, 0.24, natureBus());
  },
  /** A beaver's tail slapping the water: a sharp crack of spray over a deep hollow thump. Quiet until the lake's sounds have started. */
  tailSlap() {
    if (!lapSrc) return;
    captionSound("tailSlap");
    if (!this.enabled) return;
    noiseBurst("bandpass", 2200, 600, 0.2, 0.05, 0, natureBus());
    tone("sine", 130, 55, 0.22, 0.03, 0, 0, natureBus());
  },
  /** A swan hissing at a cast that landed too close: a long, breathy rasp. Quiet until the lake's sounds have started. */
  swanHiss() {
    if (!lapSrc) return;
    captionSound("swanHiss");
    if (!this.enabled) return;
    noiseBurst("bandpass", 3400, 2600, 0.7, 0.035, 0, natureBus());
    noiseBurst("highpass", 5200, 4200, 0.5, 0.02, 0.08, natureBus());
  },
  /** A bird hitting the water out on the lake: a soft, far-off plunge. Quiet until the lake's sounds have started. */
  farSplash() {
    if (!lapSrc) return;
    captionSound("farSplash");
    if (!this.enabled) return;
    tone("sine", 300, 70, 0.14, 0.03, 0, 0, natureBus());
    noiseBurst("bandpass", 1600, 600, 0.22, 0.02, 0.02, natureBus());
  },
  /** A duckling or two peeping: thin, high, rising notes. Quiet until the lake's sounds have started. */
  peep() {
    if (!this.enabled || !lapSrc) return;
    const notes = 1 + Math.floor(Math.random() * 3);
    for (let n = 0; n < notes; n += 1) {
      const base = 3000 + Math.random() * 500;
      tone("sine", base, base * 1.15, 0.07, 0.0045, n * (0.14 + Math.random() * 0.08), 0, natureBus());
    }
  },
  /**
   * Thunder `when` seconds from now: low-passed noise that rolls and grumbles away. A near strike (1) opens on a
   * sharp crack and rolls louder; a far one (0) is only a low rumble. Quiet until the lake's sounds have started.
   */
  thunder(when: number, near: number) {
    if (!lapSrc) return;
    window.setTimeout(() => captionSound(near > 0.6 ? "thunderNear" : "thunderFar"), when * 1000);
    if (!this.enabled) return;
    const ac = audio();
    const t = ac.currentTime + when;
    const length = 3.5 + (1 - near) * 2.5;
    const src = ac.createBufferSource();
    src.buffer = noise();
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(160 + near * 340, t);
    filter.frequency.exponentialRampToValueAtTime(70, t + length);
    const level = ac.createGain();
    const peak = 0.05 * (0.35 + 0.65 * near);
    level.gain.setValueAtTime(0.0001, t);
    level.gain.exponentialRampToValueAtTime(peak, t + 0.06 + (1 - near) * 0.5);
    // A few grumbles as the roll comes back off the hills.
    for (let i = 1; i <= 3; i++) {
      const at = t + (length * i) / 4.5;
      level.gain.setTargetAtTime(peak * (0.9 - i * 0.2) * (0.6 + Math.random() * 0.4), at, 0.25);
    }
    level.gain.setTargetAtTime(0.0001, t + length * 0.8, 0.3);
    src.connect(filter).connect(level).connect(natureBus());
    src.start(t);
    src.stop(t + length + 1.5);
    if (near > 0.6) noiseBurst("bandpass", 1500, 400, 0.18, 0.03 * near, when, natureBus());
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
