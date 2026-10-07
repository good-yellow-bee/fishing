import { inLake } from "@stillwater/shared";
import type { ScenePhase } from "./types";
import { bedHeight, waterHeight } from "./water";

/** Seconds for the body to climb from below to just under the bobber. */
export const RISE_SEC = 1.05;

/** Seconds for the take to close on the lure after the bite. */
export const TAKE_SEC = 0.28;

/** Seconds for the turn-away after a missed strike. */
export const TURN_SEC = 0.85;

/** Group scale of the rise mesh. Extents below match that scale. */
export const RISE_SCALE = 0.64;

/** Meters from the body origin to the back and the belly. */
export const RISE_HALF_H = 0.22;

/** Meters from the origin to the nose, along local +z. */
export const RISE_NOSE = 0.7;

/** Meters from the origin to the tail, along local -z. */
export const RISE_TAIL = 0.8;

/** Meters from the origin to each flank. */
export const RISE_HALF_W = 0.36;

const SURFACE_GAP = 0.03;
const BED_GAP = 0.03;
const RISE_TRAVEL = 1.05;
const START_DIST = 1.15;
const ARRIVE_DIST = 0.78;
const TAKE_DIST = 0.52;
const SIDE = 0.34;
const PITCH_DEEP = -0.4;
const PITCH_HIGH = -0.16;
const PITCH_TAKE = -0.5;
const PITCH_AWAY = -0.05;
const DOCK = { minX: -1.05, maxX: 1.05, minZ: 5.2, maxZ: 8.5 };

export type RiseMode = "off" | "rise" | "take" | "turn";

export type RisePose = {
  show: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

/** Rise while the lure sits. Take on the bite. Turn on the miss. Off in the air, the fight, and the landing. */
export function riseMode(phase: ScenePhase, flying: boolean, missing: boolean, landing: boolean): RiseMode {
  if (flying || landing || phase === "fight") return "off";
  if (phase === "waiting") return "rise";
  if (phase === "hookset") return "take";
  if (phase === "result" && missing) return "turn";
  return "off";
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smooth(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, u: number) {
  return from + (to - from) * u;
}

function shortest(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function onDock(x: number, z: number) {
  return x >= DOCK.minX && x <= DOCK.maxX && z >= DOCK.minZ && z <= DOCK.maxZ;
}

type Offset = { dx: number; dy: number; dz: number };

/** Local body point after pitch (X) then yaw (Y). */
function turned(lx: number, ly: number, lz: number, yaw: number, pitch: number): Offset {
  const y1 = ly * Math.cos(pitch) - lz * Math.sin(pitch);
  const z1 = ly * Math.sin(pitch) + lz * Math.cos(pitch);
  return {
    dx: lx * Math.cos(yaw) + z1 * Math.sin(yaw),
    dy: y1,
    dz: -lx * Math.sin(yaw) + z1 * Math.cos(yaw),
  };
}

function offsets(yaw: number, pitch: number) {
  return [
    turned(0, RISE_HALF_H, 0, yaw, pitch),
    turned(0, -RISE_HALF_H, 0, yaw, pitch),
    turned(0, 0, RISE_NOSE, yaw, pitch),
    turned(0, 0, -RISE_TAIL, yaw, pitch),
    turned(RISE_HALF_W, 0, 0, yaw, pitch),
    turned(-RISE_HALF_W, 0, 0, yaw, pitch),
  ];
}

function bodyFits(x: number, z: number, yaw: number) {
  return offsets(yaw, 0).every((tip) => {
    const px = x + tip.dx;
    const pz = z + tip.dz;
    return inLake(px, pz) && !onDock(px, pz);
  });
}

/** Center y such that every tipped sample stays under the chop and above the bed. */
function yBand(x: number, z: number, yaw: number, pitch: number, time: number) {
  let lo = Number.NEGATIVE_INFINITY;
  let hi = Number.POSITIVE_INFINITY;
  for (const tip of offsets(yaw, pitch)) {
    const tx = x + tip.dx;
    const tz = z + tip.dz;
    hi = Math.min(hi, waterHeight(tx, tz, time) - SURFACE_GAP - tip.dy);
    lo = Math.max(lo, bedHeight(tx, tz) + BED_GAP - tip.dy);
  }
  if (!(hi > lo)) return null;
  return { lo, hi };
}

type Basis = { ox: number; oz: number; sx: number; sz: number };

function lakeward(bobberX: number, bobberZ: number, anglerX: number, anglerZ: number): Basis {
  let ox = bobberX - anglerX;
  let oz = bobberZ - anglerZ;
  const reach = Math.hypot(ox, oz);
  if (reach < 1e-4) return { ox: 0, oz: -1, sx: 1, sz: 0 };
  ox /= reach;
  oz /= reach;
  return { ox, oz, sx: -oz, sz: ox };
}

type Flat = { x: number; z: number; yaw: number };

function lays(dist: number, side: number, basis: Basis, bobberX: number, bobberZ: number): Flat | null {
  for (let i = 0; i <= 5; i += 1) {
    const s = side * (1 - i / 5);
    const x = bobberX + basis.ox * dist + basis.sx * s;
    const z = bobberZ + basis.oz * dist + basis.sz * s;
    const yaw = Math.atan2(bobberX - x, bobberZ - z);
    if (!Number.isFinite(yaw)) continue;
    if (bodyFits(x, z, yaw)) return { x, z, yaw };
  }
  return null;
}

function settle(dist: number, side: number, basis: Basis, bobberX: number, bobberZ: number): Flat | null {
  const step = 0.05;
  let min: number | null = null;
  let max: number | null = null;
  for (let i = 1; i <= 44; i += 1) {
    const d = i * step;
    if (lays(d, 0, basis, bobberX, bobberZ)) {
      if (min == null) min = d;
      max = d;
    }
  }
  if (min == null || max == null) return null;
  const used = Math.min(max, Math.max(min, dist));
  return lays(used, side, basis, bobberX, bobberZ) ?? lays(min, 0, basis, bobberX, bobberZ);
}

function hidden(): RisePose {
  return { show: false, x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
}

function build(
  dist: number,
  side: number,
  pitch: number,
  climb: number,
  bobberX: number,
  bobberZ: number,
  anglerX: number,
  anglerZ: number,
  time: number,
): RisePose {
  const basis = lakeward(bobberX, bobberZ, anglerX, anglerZ);
  let nextPitch = pitch;
  for (let i = 0; i < 5; i += 1) {
    const flat = settle(dist, side, basis, bobberX, bobberZ);
    if (flat) {
      const band = yBand(flat.x, flat.z, flat.yaw, nextPitch, time);
      if (band) {
        const u = clamp01(climb);
        const deep = Math.max(band.lo, band.hi - RISE_TRAVEL);
        let y = deep + (band.hi - deep) * u;
        y += Math.sin(time * 1.7) * 0.02 * u;
        y = Math.min(band.hi, Math.max(band.lo, y));
        return { show: true, x: flat.x, y, z: flat.z, yaw: flat.yaw, pitch: nextPitch };
      }
    }
    nextPitch *= 0.55;
  }
  return hidden();
}

/** World pose while the lure is sitting. Age is seconds since it sat. */
export function risePose(
  age: number,
  bobberX: number,
  bobberZ: number,
  anglerX: number,
  anglerZ: number,
  time: number,
): RisePose {
  const u = smooth(Math.max(0, age) / RISE_SEC);
  return build(
    lerp(START_DIST, ARRIVE_DIST, u),
    SIDE * (1 - u),
    lerp(PITCH_DEEP, PITCH_HIGH, u),
    u,
    bobberX,
    bobberZ,
    anglerX,
    anglerZ,
    time,
  );
}

/** Closes on the lure from wherever the rise had reached. */
export function takePose(
  biteAge: number,
  heldAge: number,
  bobberX: number,
  bobberZ: number,
  anglerX: number,
  anglerZ: number,
  time: number,
): RisePose {
  const riseU = smooth(clamp01(Math.max(0, heldAge) / RISE_SEC));
  const u = smooth(clamp01(Math.max(0, biteAge) / TAKE_SEC));
  return build(
    lerp(lerp(START_DIST, ARRIVE_DIST, riseU), TAKE_DIST, u),
    SIDE * (1 - riseU) * (1 - u),
    lerp(lerp(PITCH_DEEP, PITCH_HIGH, riseU), PITCH_TAKE, u),
    riseU + (1 - riseU) * u,
    bobberX,
    bobberZ,
    anglerX,
    anglerZ,
    time,
  );
}

/** Peels off the lure. Age 0 matches the finished take. */
export function turnPose(
  missAge: number,
  bobberX: number,
  bobberZ: number,
  anglerX: number,
  anglerZ: number,
  time: number,
): RisePose {
  const from = takePose(TAKE_SEC, RISE_SEC, bobberX, bobberZ, anglerX, anglerZ, time);
  if (!from.show || missAge <= 0) return from;
  const u = smooth(Math.min(1, missAge / TURN_SEC));
  const away = Math.atan2(from.x - bobberX, from.z - bobberZ);
  const target = away + 0.95;
  const yawDelta = shortest(from.yaw, target);
  const basis = lakeward(bobberX, bobberZ, anglerX, anglerZ);
  for (let step = 0; step <= 8; step += 1) {
    const fade = 1 - step / 8;
    const yaw = from.yaw + yawDelta * u * fade;
    const pitch = lerp(from.pitch, PITCH_AWAY, u);
    const swim = 1.15 * u * fade;
    const x = from.x + Math.sin(yaw) * swim + basis.ox * swim * 0.35;
    const z = from.z + Math.cos(yaw) * swim + basis.oz * swim * 0.35;
    if (!bodyFits(x, z, yaw)) continue;
    const band = yBand(x, z, yaw, pitch, time);
    if (!band) continue;
    const y = Math.min(band.hi, Math.max(band.lo, from.y - 0.2 * u));
    return { show: true, x, y, z, yaw, pitch };
  }
  return from;
}
