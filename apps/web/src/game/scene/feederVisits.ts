import { SHOP_X, SHOP_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A bird feeder on a post by the shack, put out for the winter, and the chickadees that use it:
 * each lands on the tray, pecks at the seed for a few seconds, flies up into the oak behind
 * the shack, and comes back for more. Pure in time.
 */

/** Where the feeder's post stands: west of the shack, out past the campfire, where it can be seen from the shack. */
export const FEEDER_AT = { x: SHOP_X - 2.4, z: SHOP_Z - 1.3 };
/** How high the seed tray is, in metres. */
export const TRAY_Y = 1.3;
/** Where the birds go between visits: into the crown of the oak west of the shack. */
export const ROOST = { x: SHOP_X - 3.1, y: 3.4, z: SHOP_Z + 1.4 };
/** Seconds for one bird's round: on the tray, off to the tree, a while there, and back. */
export const VISIT_SEC = 10;
const PERCH_SEC = 4.5;
const FLY_SEC = 1.3;
export const BIRD_COUNT = 3;

/** The feeder goes up for the winter. */
export function feederUp(season: LakeSeason) {
  return season === "winter";
}

/** The birds come to it from dawn through the day, but not in the rain. */
export function chickadeesOut(hour: LakeHour, sky: Sky | undefined) {
  return (hour === "dawn" || hour === "day") && sky !== "rain";
}

/** Where on the tray bird `i` lands, and which way it faces there. */
function perch(i: number) {
  const a = (i / BIRD_COUNT) * Math.PI * 2 + 0.4;
  return { x: FEEDER_AT.x + Math.cos(a) * 0.17, y: TRAY_Y + 0.04, z: FEEDER_AT.z + Math.sin(a) * 0.17, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
}

function smooth(x: number) {
  return x * x * (3 - 2 * x);
}

export type BirdPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 0 on the tray, 1 in flight: how fast the wings beat. */
  flying: number;
  /** How far down its head is, pecking at the seed, 0 to 1. */
  peck: number;
  /** Out of sight in the tree. */
  away: boolean;
};

/** Bird `i`'s pose `time` seconds in. The birds keep out of step, so the tray is seldom empty or full. */
export function chickadeeAt(i: number, time: number): BirdPose {
  const into = (((time + (i * VISIT_SEC) / BIRD_COUNT) % VISIT_SEC) + VISIT_SEC) % VISIT_SEC;
  const spot = perch(i);
  if (into < PERCH_SEC) {
    // Quick pecks in bursts, with a look round between.
    const beat = Math.max(0, Math.sin(into * 9 + i)) * (Math.sin(into * 1.7 + i * 2) > -0.2 ? 1 : 0);
    return { ...spot, flying: 0, peck: beat, away: false };
  }
  const leave = PERCH_SEC;
  const back = VISIT_SEC - FLY_SEC;
  const legs = [
    { from: spot, to: ROOST, start: leave, out: true },
    { from: ROOST, to: spot, start: back, out: false },
  ];
  for (const leg of legs) {
    const k = (into - leg.start) / FLY_SEC;
    if (k < 0 || k > 1) continue;
    const s = smooth(k);
    const dip = Math.sin(k * Math.PI) * 0.35;
    const x = leg.from.x + (leg.to.x - leg.from.x) * s;
    const z = leg.from.z + (leg.to.z - leg.from.z) * s;
    // A chickadee's flight is bouncy: it dips and rises between wingbeat bursts.
    const y = leg.from.y + (leg.to.y - leg.from.y) * s - dip + Math.sin(k * Math.PI * 4) * 0.06;
    const yaw = Math.atan2(leg.to.x - leg.from.x, leg.to.z - leg.from.z);
    return { x, y, z, yaw, flying: 1, peck: 0, away: false };
  }
  return { x: ROOST.x, y: ROOST.y, z: ROOST.z, yaw: 0, flying: 0, peck: 0, away: true };
}
