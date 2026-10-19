import { DOCK_PLANKS, DOCK_STAND_Z, inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { MOTH_LAMPS } from "./mothOrbit";
import { smoothstep } from "./visitClock";

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
export const SWOOP_EVERY_SEC = 26;
export const SWOOP_SEC = 3.2;
const SWOOP_FIRST_SEC = 9;
/** The lantern it hawks round, the lantern on the right of the dock's end, and how wide and high it circles there. */
const corner = (lamp: { x: number; z: number }) => Math.hypot(lamp.x - DOCK_PLANKS.maxX, lamp.z - DOCK_PLANKS.minZ);
export const SWOOP_LAMP = MOTH_LAMPS.reduce((a, b) => (corner(b) < corner(a) ? b : a));
const SWOOP_RADIUS = 0.45;
const SWOOP_Y = BAT_LOW + 0.15;

/** How far the first bat has broken off its loop for the lantern at `t`, 0 to 1: in, a few tight turns round the light, and out. */
export function swoopAt(t: number) {
  const since = t - SWOOP_FIRST_SEC;
  if (since < 0) return 0;
  const into = since % SWOOP_EVERY_SEC;
  if (into >= SWOOP_SEC) return 0;
  return Math.min(smoothstep(into / 0.9), smoothstep((SWOOP_SEC - into) / 0.9));
}

function flight(index: number, bat: (typeof BATS)[number], t: number) {
  const loop = place(bat, t);
  const swoop = index === 0 ? swoopAt(t) : 0;
  if (swoop === 0) return loop;
  const turn = t * 4.5;
  const light = { x: SWOOP_LAMP.x + Math.cos(turn) * SWOOP_RADIUS, y: SWOOP_Y + 0.1 * Math.sin(turn * 2), z: SWOOP_LAMP.z - 0.2 + Math.sin(turn) * SWOOP_RADIUS };
  return { x: loop.x + (light.x - loop.x) * swoop, y: loop.y + (light.y - loop.y) * swoop, z: loop.z + (light.z - loop.z) * swoop };
}

/** Bat `index` at `time`, heading the way it flies. `still` holds it gliding with wings out, for reduced motion. */
export function batAt(index: number, time: number, still = false): BatPose {
  const i = ((index % BAT_COUNT) + BAT_COUNT) % BAT_COUNT;
  const bat = BATS[i]!;
  const t = still ? 0 : time;
  const here = flight(i, bat, t);
  const ahead = flight(i, bat, t + 0.05);
  const flap = still ? 0 : Math.sin((time + bat.phase) * BAT_FLAP_HZ * Math.PI * 2);
  return { ...here, yaw: Math.atan2(ahead.x - here.x, ahead.z - here.z), flap };
}

/** Whether a bat is over the lake; the loops are sized so it always is. */
export function batOverWater(pose: BatPose) {
  return inLake(pose.x, pose.z);
}
