import type { LakeHour, LakeSeason } from "@stillwater/shared";

/**
 * A cormorant on a rock out in the far water: it stands with its wings
 * hung open to dry, folds them, slips in to fish around the rock, and
 * climbs back out to dry again.
 */
export const CORMORANT_ROCK = { x: 6.5, z: -4.5 };
/** Height of the rock's top, where its feet stand. */
export const ROCK_TOP = 0.36;
/** One round: drying on the rock, folded, hopping in, fishing, climbing out. */
export const DRY_SEC = 48;
export const FOLD_SEC = 10;
export const HOP_SEC = 1.2;
export const FISH_SEC = 26;
export const CLIMB_SEC = 1.4;
export const CORMORANT_CYCLE = DRY_SEC + FOLD_SEC + HOP_SEC + FISH_SEC + CLIMB_SEC;
/** Each dive while fishing: up on the water, then under. */
const DIVE_EVERY = 6.5;
const UNDER_SEC = 4;
const SWIM_RADIUS = 2.4;

export type CormorantPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 0 folded, 1 hung fully open to dry. */
  spread: number;
  /** 0 riding the surface or on the rock, 1 out of sight underwater. */
  under: number;
  /** On the water rather than on the rock (it swims low). */
  swimming: boolean;
};

/** Out from dawn to dusk while the lake is open. */
export function cormorantOut(hour: LakeHour, season: LakeSeason) {
  return hour !== "night" && season !== "winter";
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function ease(u: number) {
  const t = clamp01(u);
  return t * t * (3 - 2 * t);
}

/** Where it swims `into` seconds into a fishing spell: a slow loop around the rock. */
function swimAt(into: number) {
  const angle = 0.6 + into * 0.12;
  return {
    x: CORMORANT_ROCK.x + Math.cos(angle) * SWIM_RADIUS,
    z: CORMORANT_ROCK.z + Math.sin(angle) * SWIM_RADIUS,
    yaw: Math.atan2(-Math.sin(angle), Math.cos(angle)),
  };
}

export function cormorantPose(time: number): CormorantPose {
  const t = ((time % CORMORANT_CYCLE) + CORMORANT_CYCLE) % CORMORANT_CYCLE;
  // Faces the dock as it dries, the way a bird turns its wings to the sun.
  const rock = { x: CORMORANT_ROCK.x, y: ROCK_TOP, z: CORMORANT_ROCK.z, yaw: -0.6, under: 0, swimming: false };
  if (t < DRY_SEC) {
    // Opens over the first seconds; now and then fans the wings a little.
    const open = ease(t / 1.5);
    const fan = Math.max(0, Math.sin(t * 0.9)) ** 8 * 0.15;
    return { ...rock, spread: open * (1 - fan) };
  }
  const folded = t - DRY_SEC;
  if (folded < FOLD_SEC) return { ...rock, spread: 1 - ease(folded / 1.2) };
  const hop = folded - FOLD_SEC;
  const start = swimAt(0);
  if (hop < HOP_SEC) {
    const u = hop / HOP_SEC;
    return {
      x: rock.x + (start.x - rock.x) * u,
      y: ROCK_TOP * (1 - u) + Math.sin(u * Math.PI) * 0.35,
      z: rock.z + (start.z - rock.z) * u,
      yaw: start.yaw,
      spread: Math.sin(u * Math.PI) * 0.5,
      under: 0,
      swimming: u > 0.5,
    };
  }
  const fishing = hop - HOP_SEC;
  if (fishing < FISH_SEC) {
    const at = swimAt(fishing);
    const dive = fishing % DIVE_EVERY;
    const downAt = DIVE_EVERY - UNDER_SEC;
    let under = 0;
    if (dive >= downAt) {
      const k = dive - downAt;
      under = k < 0.4 ? k / 0.4 : k > UNDER_SEC - 0.4 ? (UNDER_SEC - k) / 0.4 : 1;
    }
    // Always comes up for the last stretch, ready to climb out.
    if (fishing > FISH_SEC - 2) under = 0;
    return { x: at.x, y: 0, z: at.z, yaw: at.yaw, spread: 0, under, swimming: true };
  }
  const climb = (fishing - FISH_SEC) / CLIMB_SEC;
  const end = swimAt(FISH_SEC);
  return {
    x: end.x + (rock.x - end.x) * climb,
    y: ROCK_TOP * climb + Math.sin(climb * Math.PI) * 0.3,
    z: end.z + (rock.z - end.z) * climb,
    yaw: Math.atan2(rock.x - end.x, rock.z - end.z),
    spread: Math.sin(climb * Math.PI) * 0.6,
    under: 0,
    swimming: climb < 0.5,
  };
}
