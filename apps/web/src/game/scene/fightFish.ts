import { inLake } from "@stillwater/shared";
import type { ScenePhase } from "./types";
import { RISE_HALF_H, RISE_HALF_W, RISE_NOSE, RISE_SCALE, RISE_TAIL } from "./riseMotion";
import { bedHeight, waterHeight } from "./water";

/** Group scale of the fight mesh. Extents below match that scale. */
export const FIGHT_FISH_SCALE = 0.95;

const EXTENT = FIGHT_FISH_SCALE / RISE_SCALE;

export const FIGHT_HALF_H = RISE_HALF_H * EXTENT;
export const FIGHT_HALF_W = RISE_HALF_W * EXTENT;
export const FIGHT_NOSE = RISE_NOSE * EXTENT;
export const FIGHT_TAIL = RISE_TAIL * EXTENT;

/** Tail wag intensity. The clearance box covers this amplitude. */
export const FIGHT_WAG = 1.25;

/** Unscaled mouth on the head. Multiplied by the group scale. */
export const FIGHT_MOUTH_Y = -0.1;
export const FIGHT_MOUTH_Z = 0.95;

const SURFACE_GAP = 0.03;
const BED_GAP = 0.03;
const PITCH = -0.05;
const DOCK = { minX: -1.05, maxX: 1.05, minZ: 5.2, maxZ: 8.5 };

export type FightFishPose = {
  show: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  mouthX: number;
  mouthY: number;
  mouthZ: number;
};

/** On during the fight. Off through the wait, the rise, and the strike splash. */
export function fightFishMode(phase: ScenePhase): "on" | "off" {
  return phase === "fight" ? "on" : "off";
}

type Offset = { dx: number; dy: number; dz: number };
type Point = { x: number; y: number; z: number };

function turned(lx: number, ly: number, lz: number, yaw: number, pitch: number): Offset {
  const y1 = ly * Math.cos(pitch) - lz * Math.sin(pitch);
  const z1 = ly * Math.sin(pitch) + lz * Math.cos(pitch);
  return {
    dx: lx * Math.cos(yaw) + z1 * Math.sin(yaw),
    dy: y1,
    dz: -lx * Math.sin(yaw) + z1 * Math.cos(yaw),
  };
}

function onDock(x: number, z: number) {
  return x >= DOCK.minX && x <= DOCK.maxX && z >= DOCK.minZ && z <= DOCK.maxZ;
}

function corners(yaw: number, pitch: number) {
  const tips: Offset[] = [];
  for (const x of [FIGHT_HALF_W, -FIGHT_HALF_W]) {
    for (const y of [FIGHT_HALF_H, -FIGHT_HALF_H]) {
      for (const z of [FIGHT_NOSE, -FIGHT_TAIL]) tips.push(turned(x, y, z, yaw, pitch));
    }
  }
  return tips;
}

function mouthOffset(yaw: number, pitch: number) {
  return turned(0, FIGHT_MOUTH_Y * FIGHT_FISH_SCALE, FIGHT_MOUTH_Z * FIGHT_FISH_SCALE, yaw, pitch);
}

function bodyFits(x: number, z: number, yaw: number, pitch: number) {
  if (!corners(yaw, pitch).every((tip) => inLake(x + tip.dx, z + tip.dz) && !onDock(x + tip.dx, z + tip.dz))) {
    return false;
  }
  const mouth = mouthOffset(yaw, pitch);
  return inLake(x + mouth.dx, z + mouth.dz) && !onDock(x + mouth.dx, z + mouth.dz);
}

function yBand(x: number, z: number, yaw: number, pitch: number, time: number) {
  let lo = Number.NEGATIVE_INFINITY;
  let hi = Number.POSITIVE_INFINITY;
  const tips = corners(yaw, pitch);
  tips.push(mouthOffset(yaw, pitch));
  for (const tip of tips) {
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

function hidden(): FightFishPose {
  return { show: false, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, mouthX: 0, mouthY: 0, mouthZ: 0 };
}

function tryPlace(mouthX: number, mouthZ: number, anglerX: number, anglerZ: number, pitch: number, time: number) {
  const yaw = Math.atan2(anglerX - mouthX, anglerZ - mouthZ);
  if (!Number.isFinite(yaw)) return null;
  const mouth = mouthOffset(yaw, pitch);
  const x = mouthX - mouth.dx;
  const z = mouthZ - mouth.dz;
  if (!bodyFits(x, z, yaw, pitch)) return null;
  const band = yBand(x, z, yaw, pitch, time);
  if (!band) return null;
  let y = band.hi + Math.sin(time * 2.2) * 0.012;
  y = Math.min(band.hi, Math.max(band.lo, y));
  return {
    show: true,
    x,
    y,
    z,
    yaw,
    pitch,
    mouthX,
    mouthY: y + mouth.dy,
    mouthZ,
  } satisfies FightFishPose;
}

/**
 * Head on the line, body out past the lure.
 * A longer lead (a run) sits farther from the angler than a short one (a haul).
 */
export function fightFishPose(
  bobberX: number,
  bobberZ: number,
  anglerX: number,
  anglerZ: number,
  lead: number,
  side: number,
  time: number,
): FightFishPose {
  const basis = lakeward(bobberX, bobberZ, anglerX, anglerZ);
  const wanted = Math.max(0, lead);
  const leads: number[] = [];
  for (let i = 0; i <= 8; i += 1) leads.push(wanted * (1 - i / 8));
  for (let i = 1; i <= 6; i += 1) leads.push(wanted + i * 0.22);
  let pitch = PITCH;
  for (let p = 0; p < 5; p += 1) {
    for (let s = 0; s <= 6; s += 1) {
      const sideTry = side * (1 - s / 6);
      for (const leadTry of leads) {
        const mouthX = bobberX + basis.ox * leadTry + basis.sx * sideTry;
        const mouthZ = bobberZ + basis.oz * leadTry + basis.sz * sideTry;
        const pose = tryPlace(mouthX, mouthZ, anglerX, anglerZ, pitch, time);
        if (pose) return pose;
      }
    }
    pitch *= 0.45;
  }
  return hidden();
}

/** Fight line ends on the mouth. Every other phase keeps the bobber. */
export function fightLineEnd(phase: ScenePhase, pose: FightFishPose, bobber: Point): Point {
  if (fightFishMode(phase) !== "on" || !pose.show) return { x: bobber.x, y: bobber.y, z: bobber.z };
  return { x: pose.mouthX, y: pose.mouthY, z: pose.mouthZ };
}
