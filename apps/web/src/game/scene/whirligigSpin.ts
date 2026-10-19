import { inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/** A raft of whirligig beetles spinning on the still water off the dock's right side; Lite effects keep half. */
export const WHIRLIGIG_COUNT = 14;
export const WHIRLIGIG_RAFT = { x: 2.5, z: 4.0, r: 0.42 } as const;
/** The fastest drift (as WIND_DRIFT gives it) they still gather in. */
export const WHIRLIGIG_MAX_WIND = 0.08;
/** How far the whole raft drifts about its place, in metres. */
export const RAFT_DRIFT = 0.22;

/** On warm, dry days from spring to the end of summer, when the water is no rougher than a breeze. */
export function whirligigsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, windSpeed: number) {
  return (season === "spring" || season === "summer") && hour === "day" && sky !== "rain" && windSpeed <= WHIRLIGIG_MAX_WIND;
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export type WhirligigPose = { x: number; z: number; yaw: number };

/** The raft's middle `time` seconds in: it wanders slowly about its place. */
export function raftMiddle(time: number) {
  return {
    x: WHIRLIGIG_RAFT.x + Math.sin(time * 0.05) * RAFT_DRIFT,
    z: WHIRLIGIG_RAFT.z + Math.sin(time * 0.037 + 1.3) * RAFT_DRIFT * 0.6,
  };
}

/**
 * Beetle `i`, `time` seconds in: it whirls in tight, quick loops, now one way and now the other,
 * about its own spot in the raft, and the spots turn slowly round the raft's middle. Reduced
 * motion holds each at its spot.
 */
export function whirligigAt(i: number, time: number, still = false): WhirligigPose {
  const t = still ? 0 : time;
  const middle = raftMiddle(t);
  const place = unit(i + 1) * Math.PI * 2 + t * 0.12 * (unit(i + 2) > 0.5 ? 1 : -1);
  const reach = Math.sqrt(unit(i + 3)) * WHIRLIGIG_RAFT.r;
  const cx = middle.x + Math.cos(place) * reach;
  const cz = middle.z + Math.sin(place) * reach;
  const loop = 0.035 + unit(i + 4) * 0.05;
  const rate = 4 + unit(i + 5) * 5;
  const phase = unit(i + 6) * Math.PI * 2;
  // The loop's turning slows, stops and turns back now and then, so the beetles whirl both ways.
  const swing = 2.2 + unit(i + 7) * 1.5;
  const angle = phase + (rate / swing) * Math.sin(t * swing * 0.25 + phase) * 4;
  const turning = rate * Math.cos(t * swing * 0.25 + phase);
  const x = cx + Math.cos(angle) * loop;
  const z = cz + Math.sin(angle) * loop;
  // Facing along the loop: its velocity is (-sin, cos) times how fast it turns.
  const dir = turning >= 0 ? 1 : -1;
  return { x, z, yaw: Math.atan2(-Math.sin(angle) * dir, Math.cos(angle) * dir) };
}

/** Whether the raft stays on open water, whichever way it drifts. */
export function raftOnWater() {
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    const x = WHIRLIGIG_RAFT.x + Math.cos(a) * (WHIRLIGIG_RAFT.r + RAFT_DRIFT + 0.1);
    const z = WHIRLIGIG_RAFT.z + Math.sin(a) * (WHIRLIGIG_RAFT.r + RAFT_DRIFT + 0.1);
    if (!inLake(x, z)) return false;
  }
  return true;
}
