import { LAKE_CENTER_Z, inLake, type LakeSeason } from "@stillwater/shared";

/** Moulted swan feathers afloat on the open water in front of the dock. */
export const FEATHER_COUNT = 10;
/** Seconds each feather takes to drift its stretch of water before another takes its place. */
export const FEATHER_CYCLE_SEC = 70;
/** Where they float: a band of open water out from the dock, as an offset from the lake's middle. */
const AREA = { x: 7, zFrom: -3.5, zTo: 4.5 };
/** Metres a second a feather drifts on a still day, and more for each metre a second of wind. */
const CALM_DRIFT = 0.02;
const WIND_PUSH = 0.7;
/** Which way they drift on a still day, as a unit vector. */
const CALM_HEADING = { x: 0.94, z: 0.34 };
/** Share of the cycle a feather takes to come into view and to go. */
const FADE = 0.12;

/** The swans moult over the summer, and their feathers stay afloat into fall. */
export function feathersOut(season: LakeSeason) {
  return season === "summer" || season === "fall";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Feather = { x: number; z: number; yaw: number; size: number; color: number };

/**
 * Feather `i` at `time`: drifting slowly downwind along its own line, turning lazily as it goes, and
 * fading in at one end of its run and out at the other, so the water never runs short of them.
 * Null while it is off the water.
 */
export function featherAt(i: number, time: number, wind: { x: number; z: number }): Feather | null {
  const speed = Math.hypot(wind.x, wind.z);
  const head = speed < 1e-3 ? CALM_HEADING : { x: wind.x / speed, z: wind.z / speed };
  const drift = CALM_DRIFT + speed * WIND_PUSH;
  const shifted = time / FEATHER_CYCLE_SEC + seeded(i, 1);
  const round = Math.floor(shifted);
  const into = shifted - round;
  // Each round a feather settles somewhere new.
  const homeX = (seeded(i * 7 + round, 2) * 2 - 1) * AREA.x;
  const homeZ = LAKE_CENTER_Z + AREA.zFrom + seeded(i * 7 + round, 3) * (AREA.zTo - AREA.zFrom);
  const along = (into - 0.5) * drift * FEATHER_CYCLE_SEC;
  const x = homeX + head.x * along;
  const z = homeZ + head.z * along;
  if (!inLake(x, z)) return null;
  const turn = (seeded(i, 4) - 0.5) * 0.12;
  return {
    x,
    z,
    yaw: seeded(i * 7 + round, 5) * Math.PI * 2 + time * turn,
    size: Math.min(1, into / FADE, (1 - into) / FADE),
    color: i % 3 === 0 ? 1 : 0,
  };
}
