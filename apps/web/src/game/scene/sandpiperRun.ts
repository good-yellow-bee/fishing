import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A little flock of sandpipers passing through in spring and fall, working the far bank's
 * waterline below the birdwatcher at first light, before the dog walker comes along the path: each runs a few quick steps, stops to probe the wet sand twice,
 * and runs on, the flock drifting along the stretch and turning back at its ends. Their tails
 * teeter as they stand. Pure in time.
 */

type Spot = { x: number; z: number };

export const SANDPIPER_COUNT = 4;
/** The stretch of shore they work (shape angles, its +y the world's -z) and how far up from the water. */
const FROM = 1.6;
const TO = 1.86;
const OUT = 0.1;
/**
 * Each bird's place in the flock, along the shore and up the sand, and where in its stride it is.
 * The phases stay within one stride, so no bird is ever a whole run behind another: kept more
 * than a run apart, they never meet as the flock turns.
 */
const BIRDS = [
  { along: 0, out: 0, phase: 0 },
  { along: 0.024, out: 0.07, phase: 1.1 },
  { along: 0.048, out: 0.01, phase: 2.3 },
  { along: 0.072, out: 0.09, phase: 0.6 },
] as const;
/** One stride: a quick run then a stop to probe. */
export const STRIDE_SEC = 2.8;
const RUN_SEC = 0.7;
/** How far along the shore one run carries them, in radians of shape angle. */
const STEP = 0.016;
/** Room at either end so the whole flock stays inside the stretch. */
const SPAN = TO - FROM - BIRDS[BIRDS.length - 1].along;

/** Out at dawn in spring and fall, while they pass through, unless it is foggy. */
export function sandpipersOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "dawn" && (season === "spring" || season === "fall") && sky !== "fog";
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export type SandpiperPose = {
  x: number;
  z: number;
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** 1 while it runs, so its body bobs with the quick steps. */
  run: number;
  /** The bill down in the sand, 0 to 1. */
  peck: number;
  /** The tail teetering up and down as it stands, -1 to 1. */
  teeter: number;
};

/** Bird `index` of the flock `time` seconds in. `still` holds the flock standing, bills up. */
export function sandpiperAt(index: number, time: number, still = false): SandpiperPose {
  const bird = BIRDS[index % BIRDS.length];
  const t = still ? index * 2 * STRIDE_SEC : Math.max(0, time) + bird.phase;
  const strides = Math.floor(t / STRIDE_SEC);
  const into = t - strides * STRIDE_SEC;
  const running = !still && into < RUN_SEC;
  const walked = (strides + smooth(into / RUN_SEC)) * STEP;
  // Up the stretch and back down it, over and over.
  const lap = walked % (2 * SPAN);
  const forward = lap < SPAN;
  const angle = FROM + (forward ? lap : 2 * SPAN - lap) + bird.along;
  const out = OUT + bird.out;
  const here = shorePoint(angle, out);
  const ahead = shorePoint(angle + (forward ? 0.01 : -0.01), out);
  // Two dips of the bill while it stands, the second a little deeper.
  const stood = into - RUN_SEC;
  const dip = (at: number, depth: number) => depth * Math.sin(Math.PI * smooth((stood - at) / 0.5));
  const peck = running || still ? 0 : Math.max(0, stood > 0.3 && stood < 0.8 ? dip(0.3, 0.8) : 0, stood > 1.2 && stood < 1.7 ? dip(1.2, 1) : 0);
  return {
    x: here.x,
    z: here.z,
    yaw: Math.atan2(ahead.x - here.x, ahead.z - here.z),
    run: running ? 1 : 0,
    peck,
    teeter: still ? 0 : Math.sin(time * 13 + index * 1.7) * (running ? 0.3 : 1),
  };
}
