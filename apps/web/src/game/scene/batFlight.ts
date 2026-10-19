import { DOCK_PLANKS, DOCK_STAND_Z, inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { MOTH_LAMPS } from "./mothOrbit";
import { smoothstep, turnBetween } from "./visitClock";

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

/** Now and then the first bat breaks off to hawk the moths round the dock's right-hand lantern: this often, and for this long. */
export const SWOOP_EVERY_SEC = 13;
export const SWOOP_SEC = 6;
const SWOOP_FIRST_SEC = 9;
/** Easing in from its loop and back out, seconds; it only goes when its loop has brought it this near the light. */
const SWOOP_EASE_SEC = 2.4;
export const SWOOP_FROM_M = 5.5;
/** The lantern on the right of the dock's end, and the turns it makes there: out over the water just off the
 * dock's end, among the moths (mothOrbit.ts), clear of anyone standing on the boards. */
const corner = (lamp: { x: number; z: number }) => Math.hypot(lamp.x - DOCK_PLANKS.maxX, lamp.z - DOCK_PLANKS.minZ);
export const SWOOP_LAMP = MOTH_LAMPS.reduce((a, b) => (corner(b) < corner(a) ? b : a));
export const SWOOP_CENTER = { x: SWOOP_LAMP.x, y: SWOOP_LAMP.y + 0.3, z: SWOOP_LAMP.z - 0.45 };
export const SWOOP_RADIUS = 0.35;
const SWOOP_SPIN = 4.5;

/** How far the first bat has broken off its loop for the lantern at `t`, 0 to 1; only in rounds that find it near enough. */
export function swoopAt(t: number) {
  const since = t - SWOOP_FIRST_SEC;
  if (since < 0) return 0;
  const into = since % SWOOP_EVERY_SEC;
  if (into >= SWOOP_SEC) return 0;
  const from = place(BATS[0]!, t - into);
  if (Math.hypot(from.x - SWOOP_CENTER.x, from.z - SWOOP_CENTER.z) > SWOOP_FROM_M) return 0;
  return Math.min(smoothstep(into / SWOOP_EASE_SEC), smoothstep((SWOOP_SEC - into) / SWOOP_EASE_SEC));
}

/** Bat `index` at `time`, heading the way it flies. `still` holds it gliding with wings out, for reduced motion. */
export function batAt(index: number, time: number, still = false): BatPose {
  const bat = BATS[((index % BAT_COUNT) + BAT_COUNT) % BAT_COUNT]!;
  const t = still ? 0 : time;
  const here = place(bat, t);
  const ahead = place(bat, t + 0.05);
  const flap = still ? 0 : Math.sin((time + bat.phase) * BAT_FLAP_HZ * Math.PI * 2);
  const yaw = Math.atan2(ahead.x - here.x, ahead.z - here.z);
  const swoop = index === 0 && !still ? swoopAt(t) : 0;
  if (swoop === 0) return { ...here, yaw, flap };
  // Round the light, its heading turning from its loop's to the circle's as it comes in, and back as it goes.
  const turn = t * SWOOP_SPIN;
  const x = SWOOP_CENTER.x + Math.cos(turn) * SWOOP_RADIUS;
  const y = SWOOP_CENTER.y + 0.08 * Math.sin(turn * 2);
  const z = SWOOP_CENTER.z + Math.sin(turn) * SWOOP_RADIUS;
  return {
    x: here.x + (x - here.x) * swoop,
    y: here.y + (y - here.y) * swoop,
    z: here.z + (z - here.z) * swoop,
    // The circle has the heading wholly by halfway in, so the loop's own quick jinks never swing it about there.
    yaw: turnBetween(yaw, Math.atan2(-Math.sin(turn), Math.cos(turn)), smoothstep(swoop * 2)),
    flap,
  };
}

/** Whether a bat is over the lake; the loops are sized so it always is, and the turns at the lantern are off the dock's end. */
export function batOverWater(pose: BatPose) {
  return inLake(pose.x, pose.z);
}
