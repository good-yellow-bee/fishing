import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A birdwatcher on the far bank in spring, when the geese bring their goslings and the swans are
 * on the water. They raise their binoculars and slowly scan the lake, lower them, jot something in
 * a notebook, and look again. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where round the shore rings they stand (the shape's +y is the world's -z) and how far back from the water. */
const BIRDER_ANGLE = 1.55;
const BIRDER_OUT = 1.7;

/** One round: raising the glasses, scanning, lowering them, writing, and a pause. */
const RAISE_SEC = 0.9;
const SCAN_SEC = 8;
const LOWER_SEC = 0.9;
const NOTE_SEC = 4;
const IDLE_SEC = 2.2;
export const WATCH_ROUND_SEC = RAISE_SEC + SCAN_SEC + LOWER_SEC + NOTE_SEC + IDLE_SEC;
/** How far either way the scan sweeps, in radians. */
const SWEEP = 0.5;

/** Out at dawn and by day in spring, unless it is raining. */
export function birderOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dawn" || hour === "day") && season === "spring" && sky !== "rain";
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** Where they stand, facing out over the lake toward its middle. */
export const BIRDER_AT = shorePoint(BIRDER_ANGLE, BIRDER_OUT);
export const BIRDER_YAW = Math.atan2(0 - BIRDER_AT.x, LAKE_CENTER_Z - BIRDER_AT.z);

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export type BirderPose = {
  /** The binoculars at the eyes, 0 hanging on their strap to 1 up. */
  glasses: number;
  /** Which way the head and glasses turn as they scan, in radians off straight out. */
  scan: number;
  /** The notebook up and the head bent over it, 0 to 1. */
  note: number;
};

/** The birdwatcher `time` seconds in. `still` holds them with the glasses up, looking straight out. */
export function birderAt(time: number, still = false): BirderPose {
  if (still) return { glasses: 1, scan: 0, note: 0 };
  const t = ((time % WATCH_ROUND_SEC) + WATCH_ROUND_SEC) % WATCH_ROUND_SEC;
  const lowerAt = RAISE_SEC + SCAN_SEC;
  const noteAt = lowerAt + LOWER_SEC;
  const glasses = t < RAISE_SEC ? smooth(t / RAISE_SEC) : t < lowerAt ? 1 : 1 - smooth((t - lowerAt) / LOWER_SEC);
  // The scan sweeps slowly one way and back, easing in and out of it at either end.
  const s = Math.min(1, Math.max(0, (t - RAISE_SEC) / SCAN_SEC));
  const scan = Math.sin(s * Math.PI * 2) * SWEEP * Math.sin(s * Math.PI);
  const n = t - noteAt;
  const note = n < 0 || n > NOTE_SEC ? 0 : smooth(n / 0.6) * (1 - smooth((n - (NOTE_SEC - 0.6)) / 0.6));
  return { glasses, scan, note };
}
