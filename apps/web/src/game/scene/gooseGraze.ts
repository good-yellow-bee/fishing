import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * A pair of Canada geese grazing the grass along the far bank in spring with their goslings: the
 * family drifts slowly up and down the bank, the parents' heads dipping to crop the grass and
 * coming up to look about, the goslings pottering round them. Pure in time.
 */

/** The stretch of bank they graze, as angles round the shore rings (the shape's +y is the world's -z), and how far back from the waterline. */
const BANK_FROM = 1.12;
const BANK_TO = 1.26;
const BANK_OUT = 2.2;
/** Seconds for the family to drift along the stretch and back. */
const DRIFT_SEC = 150;
export const PARENTS = 2;
export const GOSLINGS = 5;

/** Out at dawn and by day in spring, when the goslings are small. */
export function gooseFamilyOut(hour: LakeHour, season: LakeSeason) {
  return season === "spring" && (hour === "dawn" || hour === "day");
}

function bankPoint(u: number, out: number) {
  const angle = BANK_FROM + (BANK_TO - BANK_FROM) * u;
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export type GoosePose = {
  x: number;
  z: number;
  /** Which way the bird faces; the figures face +z. */
  yaw: number;
  /** How far its head is down cropping the grass, 0 up and looking about to 1 bill to the ground. */
  peck: number;
};

/** Where along the stretch the family is, 0 to 1, and which way it is drifting (1 east, -1 west). */
function familyAt(time: number) {
  const phase = (2 * Math.PI * time) / DRIFT_SEC;
  return { u: 0.5 - 0.5 * Math.cos(phase), way: Math.sin(phase) >= 0 ? 1 : -1 };
}

/**
 * Bird `i` of the family `time` seconds in: the parents are 0 and 1, the goslings after them.
 * `still` holds them all where they are at the start, grazing.
 */
export function gooseAt(i: number, time: number, still = false): GoosePose {
  const t = still ? 0 : time;
  const family = familyAt(t);
  const parent = i < PARENTS;
  // Each bird keeps its own place in the family, roaming a little about it on its own beats.
  const spread = parent ? 0.9 : 0.8;
  const along = (unit(i * 7 + 1) - 0.5) * 2 * spread + Math.sin(t * (0.11 + unit(i * 7 + 2) * 0.08) + i) * 0.25;
  const out = (unit(i * 7 + 3) - 0.5) * spread + Math.sin(t * (0.09 + unit(i * 7 + 4) * 0.07) + i * 2) * 0.2;
  const step = 1 / (BANK_TO - BANK_FROM) / (LAKE_RX * 0.95);
  const u = Math.min(1, Math.max(0, family.u + along * step));
  const here = bankPoint(u, BANK_OUT + out);
  const ahead = bankPoint(Math.min(1, u + 0.02), BANK_OUT + out);
  const behind = bankPoint(Math.max(0, u - 0.02), BANK_OUT + out);
  const east = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  // Mostly facing the way the family drifts, turned aside now and then to graze.
  const aside = Math.sin(t * (0.21 + unit(i * 7 + 5) * 0.2) + i * 3) * 1.1;
  const yaw = (family.way > 0 ? east : east + Math.PI) + aside;
  // Grazing: the head goes down to crop and comes up to look about, the parents more watchful than the goslings.
  const beat = Math.sin(t * (parent ? 0.8 : 1.6) + unit(i * 7 + 6) * 6);
  const peck = still ? (parent ? 0.8 : 1) : Math.min(1, Math.max(0, (beat + (parent ? 0.1 : 0.4)) * 1.6));
  return { ...here, yaw, peck };
}
