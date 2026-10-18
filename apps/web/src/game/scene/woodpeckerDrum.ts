import type { LakeHour } from "@stillwater/shared";
import { OWL_TREE } from "./owlMotion";

/**
 * A great spotted woodpecker working the owl's dead tree by day: it clings to the side of the trunk,
 * drums in short bursts, hitches a little way up between them, and when it gets near the top swoops
 * back down to start again. Pure in time.
 */

export const WOODPECKER_LAP_SEC = 20;
/** The three heights it drums at, low to high, in metres up the trunk. */
export const DRUM_HEIGHTS = [1.5, 1.95, 2.4] as const;
/** Beats a second while it drums; a real one is about this fast. */
const DRUM_HZ = 15;
/** How far out from the bark the swoop back down takes it, in metres. */
const SWOOP_OUT = 0.8;
/** The owl tree's trunk: its radius at the foot and at the top, and its height. */
const TRUNK_FOOT = 0.18;
const TRUNK_TOP = 0.1;
const TRUNK_HEIGHT = 3.4;

/** It is about from dawn through the day; the owl has the tree from dusk. */
export function woodpeckerOut(hour: LakeHour) {
  return hour === "dawn" || hour === "day";
}

type Stage = { until: number; kind: "rest" | "drum" | "hitch" | "swoop"; from: number; to: number };
const [LOW, MID, HIGH] = DRUM_HEIGHTS;
const STAGES: readonly Stage[] = [
  { until: 2, kind: "rest", from: LOW, to: LOW },
  { until: 3.2, kind: "drum", from: LOW, to: LOW },
  { until: 5, kind: "rest", from: LOW, to: LOW },
  { until: 5.8, kind: "hitch", from: LOW, to: MID },
  { until: 7.5, kind: "rest", from: MID, to: MID },
  { until: 8.7, kind: "drum", from: MID, to: MID },
  { until: 10.5, kind: "rest", from: MID, to: MID },
  { until: 11.3, kind: "hitch", from: MID, to: HIGH },
  { until: 13, kind: "rest", from: HIGH, to: HIGH },
  { until: 14.2, kind: "drum", from: HIGH, to: HIGH },
  { until: 16.5, kind: "rest", from: HIGH, to: HIGH },
  { until: 18, kind: "swoop", from: HIGH, to: LOW },
  { until: WOODPECKER_LAP_SEC, kind: "rest", from: LOW, to: LOW },
];

export type WoodpeckerPose = { x: number; y: number; z: number; peck: number; flap: number };

function smooth(x: number) {
  return x * x * (3 - 2 * x);
}

/** The bark's radius `y` metres up the trunk. */
export function trunkRadius(y: number) {
  return TRUNK_FOOT + (TRUNK_TOP - TRUNK_FOOT) * Math.min(1, Math.max(0, y / TRUNK_HEIGHT));
}

/**
 * Where the woodpecker is at `time`, on the trunk's east side (seen side-on from the dock): `peck`
 * is how far its head is thrown at the bark, 0 to 1, and `flap` its wings' beat while it swoops,
 * 0 when it clings. `still` holds it at the first drumming spot with its head back, for reduced motion.
 */
export function woodpeckerAt(time: number, still = false): WoodpeckerPose {
  const t = still ? 0 : ((time % WOODPECKER_LAP_SEC) + WOODPECKER_LAP_SEC) % WOODPECKER_LAP_SEC;
  let start = 0;
  const stage = STAGES.find((s) => t < s.until) ?? STAGES[STAGES.length - 1]!;
  for (const s of STAGES) {
    if (s === stage) break;
    start = s.until;
  }
  const k = Math.min(1, (t - start) / (stage.until - start));
  let y = stage.from;
  let out = 0;
  let peck = 0;
  let flap = 0;
  if (stage.kind === "drum") peck = Math.abs(Math.sin(t * DRUM_HZ * Math.PI));
  if (stage.kind === "hitch") {
    // Three little hops up the bark, tail braced between them.
    const hop = Math.min(2, Math.floor(k * 3));
    const within = smooth(Math.min(1, (k * 3 - hop) * 1.6));
    y = stage.from + ((stage.to - stage.from) * (hop + within)) / 3;
  }
  if (stage.kind === "swoop") {
    y = stage.from + (stage.to - stage.from) * smooth(k);
    out = Math.sin(k * Math.PI) * SWOOP_OUT;
    flap = Math.abs(Math.sin(t * 9 * Math.PI));
  }
  return { x: OWL_TREE.x + trunkRadius(y) + 0.03 + out, y, z: OWL_TREE.z, peck, flap };
}
