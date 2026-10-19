import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A leaf whirl: on dry fall days a little whirlwind now and then springs up on the far bank,
 * snatches up a swirl of fallen leaves and spins them round and up as it wanders out over the
 * water, then gives out, and the leaves flutter down onto the lake, float a moment and sink.
 * Pure in time.
 */

/** By day in fall when it is dry. */
export function leafWhirlOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "fall" && sky !== "rain" && sky !== "fog";
}

/** A whirl springs up this often. */
export const WHIRL_EVERY_SEC = 70;
/** It gathers leaves for FORM_SEC, wanders for the rest of WHIRL_SEC, then lets them go. */
const FORM_SEC = 2;
export const WHIRL_SEC = 12;
/** A let-go leaf takes this long to come down, then floats a while and sinks. */
const DROP_SEC = 3.5;
const FLOAT_SEC = 4;
const SINK_SEC = 1;
export const EVENT_SEC = WHIRL_SEC + DROP_SEC + FLOAT_SEC + SINK_SEC;
/** The first whirl comes this long in. */
const FIRST_SEC = 20;

/** Where along the far bank whirls spring up, by angle round the lake (π/2 straight across); each whirl takes the next. */
export const WHIRL_ANGLES = [2.15, 1.3, 1.85, 1.55];
/** From the bank's edge out over the shallows, as shares of the lake's radius. */
const START_REACH = 1.02;
const END_REACH = 0.8;
/** How tall and wide the spinning column is. */
export const WHIRL_TALL = 3;
const WAIST = 0.25;
const FLARE = 0.35;
/** Turns a second at the column's foot. */
const SPIN = 1.6;
export const WHIRL_LEAVES = 40;

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

function at(angle: number, reach: number) {
  return { x: Math.cos(angle) * LAKE_RX * reach, z: LAKE_CENTER_Z - Math.sin(angle) * LAKE_RZ * reach };
}

/** Which whirl `time` falls in and how far into it, or null between them. */
function whirlEvent(time: number) {
  const shifted = time - FIRST_SEC;
  const index = Math.floor(shifted / WHIRL_EVERY_SEC);
  const since = shifted - index * WHIRL_EVERY_SEC;
  if (since >= EVENT_SEC) return null;
  return { index, since };
}

export type Whirl = { x: number; z: number; strength: number };

/** The whirling column's foot at `time` and how hard it spins, 0 to 1; null when there is none. `still` shows none. */
export function leafWhirl(time: number, still = false): Whirl | null {
  if (still) return null;
  const event = whirlEvent(time);
  if (!event || event.since >= WHIRL_SEC) return null;
  return { ...whirlFoot(event.index, event.since), strength: whirlStrength(event.since) };
}

function whirlFoot(index: number, since: number) {
  const angle = WHIRL_ANGLES[((index % WHIRL_ANGLES.length) + WHIRL_ANGLES.length) % WHIRL_ANGLES.length]!;
  // A little wander sideways as it goes, different each time.
  const k = smooth(since / WHIRL_SEC);
  const wander = 0.12 * Math.sin(k * Math.PI) * (hash(index) - 0.5);
  return at(angle + wander, START_REACH + (END_REACH - START_REACH) * k);
}

function whirlStrength(since: number) {
  return smooth(since / FORM_SEC) * smooth((WHIRL_SEC - since) / 1.2);
}

export type WhirlLeaf = { x: number; z: number; height: number; spin: number; tilt: number; size: number; color: number; afloat: boolean };

/** Leaf `i` of the current whirl at `time`: spinning up the column, fluttering down, or afloat; null when there is none. */
export function whirlLeaf(i: number, time: number, still = false): WhirlLeaf | null {
  if (still) return null;
  const event = whirlEvent(time);
  if (!event) return null;
  const seed = event.index * 61 + i * 7;
  const joins = hash(seed) * FORM_SEC;
  const since = event.since;
  if (since < joins) return null;
  const color = Math.floor(hash(seed + 1) * 4);
  // Where it rides on the column: low leaves turn tight and fast, high ones wide and slow.
  const top = WHIRL_TALL * (0.25 + 0.75 * hash(seed + 2));
  const phase = hash(seed + 3) * Math.PI * 2;
  const flutter = (s: number) => 1.1 + 0.4 * Math.sin(s * 9 + phase);
  const ride = (s: number) => {
    const t = s - joins;
    const height = Math.min(top, 0.15 + t * 1.4) * smooth((WHIRL_SEC - s) / 1.2 + 0.4);
    const radius = WAIST + FLARE * height;
    const turn = phase + (SPIN * Math.PI * 2 * t) / (1 + top * 0.5);
    const foot = whirlFoot(event.index, s);
    return { x: foot.x + Math.cos(turn) * radius, z: foot.z + Math.sin(turn) * radius, height, turn };
  };
  if (since < WHIRL_SEC) {
    const r = ride(since);
    return { x: r.x, z: r.z, height: r.height, spin: r.turn + Math.PI / 2, tilt: flutter(since), size: 1, color, afloat: false };
  }
  // Let go: it drifts off the way it was flung and flutters down.
  const free = ride(WHIRL_SEC - 0.001);
  const fling = 0.5 + hash(seed + 4) * 0.6;
  const after = since - WHIRL_SEC;
  const fall = Math.min(after, DROP_SEC);
  const out = { x: Math.cos(free.turn + Math.PI / 2) * fling * smooth(fall / DROP_SEC), z: Math.sin(free.turn + Math.PI / 2) * fling * smooth(fall / DROP_SEC) };
  const x = free.x + out.x;
  const z = free.z + out.z;
  if (after < DROP_SEC) {
    const k = after / DROP_SEC;
    return {
      x: x + 0.12 * Math.sin(after * 5),
      z,
      height: free.height * (1 - k),
      spin: free.turn + Math.PI / 2 + after * 2,
      tilt: (1 - k) * flutter(since),
      size: 1,
      color,
      afloat: false,
    };
  }
  const resting = after - DROP_SEC;
  const size = resting < FLOAT_SEC ? 1 : 1 - (resting - FLOAT_SEC) / SINK_SEC;
  if (size <= 0) return null;
  return { x, z, height: 0, spin: free.turn + Math.PI / 2 + DROP_SEC * 2, tilt: 0, size, color, afloat: true };
}
