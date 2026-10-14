import { DOCK_STAND_Z, inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/** Bats hunt over the water from dusk into the night in summer, and on dry spring evenings too; rain keeps them roosting. */
export function batsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  if (sky === "rain" || sky === "fog") return false;
  if (season === "summer") return hour === "dusk" || hour === "night";
  return season === "spring" && hour === "dusk";
}

/** Bats over the water; Lite effects keep the first half. */
export const BAT_COUNT = 6;
/** Where they hunt: over the water in front of the dock, where the camera sees them against the lake. */
export const BAT_CENTER = { x: 0, z: DOCK_STAND_Z - 6.5 } as const;
/** Meters either way a loop swings, and the height band they work. */
export const BAT_REACH_X = 7;
export const BAT_REACH_Z = 3.5;
export const BAT_LOW = 1.2;
export const BAT_HIGH = 3.4;
/** Wingbeats a second. */
export const BAT_FLAP_HZ = 9;

export type BatPose = { x: number; y: number; z: number; yaw: number; flap: number };

function hash(i: number) {
  const s = Math.sin(i * 57.3 + 19.1) * 43758.5453;
  return s - Math.floor(s);
}

const BATS = Array.from({ length: BAT_COUNT }, (_, i) => ({
  // Each bat's own loop speed, phase and jink rhythm, so no two fly in step.
  speed: 0.32 + hash(i + 1) * 0.22,
  phase: hash(i + 2) * Math.PI * 2,
  jink: 2.2 + hash(i + 3) * 1.6,
  lift: 0.7 + hash(i + 4) * 0.6,
  dx: (hash(i + 5) - 0.5) * 4,
}));

function place(bat: (typeof BATS)[number], t: number) {
  const a = t * bat.speed + bat.phase;
  // A lazy figure of eight, with a quick sideways jink laid over it: the bat snapping at moths.
  const jink = Math.sin(t * bat.jink) * Math.sin(t * bat.jink * 0.37) * 0.9;
  return {
    x: BAT_CENTER.x + bat.dx + Math.sin(a) * BAT_REACH_X + jink,
    y: BAT_LOW + (BAT_HIGH - BAT_LOW) * (0.5 + 0.5 * Math.sin(a * 1.7 + bat.lift)),
    z: BAT_CENTER.z + Math.sin(a * 2) * BAT_REACH_Z + jink * 0.5,
  };
}

/** Bat `index` at `time`, heading the way it flies. `still` holds it gliding with wings out, for reduced motion. */
export function batAt(index: number, time: number, still = false): BatPose {
  const bat = BATS[((index % BAT_COUNT) + BAT_COUNT) % BAT_COUNT]!;
  const t = still ? 0 : time;
  const here = place(bat, t);
  const ahead = place(bat, t + 0.05);
  const flap = still ? 0 : Math.sin((time + bat.phase) * BAT_FLAP_HZ * Math.PI * 2);
  return { ...here, yaw: Math.atan2(ahead.x - here.x, ahead.z - here.z), flap };
}

/** Whether a bat is over the lake; the loops are sized so it always is. */
export function batOverWater(pose: BatPose) {
  return inLake(pose.x, pose.z);
}
