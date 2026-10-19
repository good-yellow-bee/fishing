import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type Sky } from "@stillwater/shared";

/**
 * Eyeshine: at night, now and then a pair of eyes catches the light at the edge of the far
 * bank, some animal come down to look at the lake. They glow a moment, blink, perhaps turn
 * aside and look again a step along, then are gone. Pure in time.
 */

/** At night, unless fog hides the far bank. */
export function eyesOut(hour: LakeHour, sky: Sky | undefined) {
  return hour === "night" && sky !== "fog";
}

/** Watchers about at once, each coming back every so often at a fresh spot. */
export const WATCHERS = 3;
const CYCLE_SEC = 26;
/** How long a pair is there, out of each cycle. */
export const SHOW_SEC = 9;
/** Along the far bank in view of the dock, as angles round the lake (π/2 straight across), and how far up from the water. */
const FROM_ANGLE = 1.15;
const TO_ANGLE = 2.05;
const BACK = 1.4;
/** Eye height above the ground: a fox-sized animal or a deer. */
const LOW = 0.3;
const HIGH = 1.1;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

export type EyePair = { x: number; y: number; z: number; spread: number; glow: number; hue: number };

/** Watcher `i`'s pair of eyes at `time`, or null when it is not there. `spread` is the gap between the eyes, `hue` 0 green to 1 amber. `still` shows none. */
export function eyePair(i: number, time: number, still = false): EyePair | null {
  if (still) return null;
  const offset = hash(i + 1) * CYCLE_SEC;
  const cycle = Math.floor((time + offset) / CYCLE_SEC);
  const since = time + offset - cycle * CYCLE_SEC;
  if (since >= SHOW_SEC) return null;
  const seed = i * 31 + cycle * 7;
  const angle = FROM_ANGLE + hash(seed) * (TO_ANGLE - FROM_ANGLE);
  // It steps along a little partway through its look.
  const step = (hash(seed + 1) - 0.5) * 0.08 * smooth((since - 4) / 1.2);
  const a = angle + step;
  const edge = lakeEdge(a);
  const back = BACK * (0.6 + 0.8 * hash(seed + 2));
  const deer = hash(seed + 3) > 0.7;
  // Fades in and out, and blinks now and then; dark while it turns aside to step along.
  const fade = smooth(since / 0.8) * smooth((SHOW_SEC - since) / 0.8);
  const blink = Math.abs(since - 2.6 - hash(seed + 4) * 1.2) < 0.09 || Math.abs(since - 6.8) < 0.09 ? 0 : 1;
  const turned = since > 3.8 && since < 5.4 ? 0 : 1;
  return {
    x: Math.cos(a) * (LAKE_RX * edge + back),
    y: deer ? HIGH : LOW + hash(seed + 5) * 0.15,
    z: LAKE_CENTER_Z - Math.sin(a) * (LAKE_RZ * edge + back),
    spread: deer ? 0.16 : 0.09,
    glow: fade * blink * turned,
    hue: deer ? 0.15 : 0.2 + 0.8 * hash(seed + 6),
  };
}
