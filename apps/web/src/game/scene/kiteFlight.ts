import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A child flying a kite on a breezy day. They stand on whichever bank the wind blows from, so
 * the kite flies out over the lake on its string, swooping from side to side as the gusts take
 * it, its tail streaming behind. Pure in time.
 */

type Spot = { x: number; z: number };

/** The drift (m/s) of a full breeze, as the windsock's; below `BREEZE` there is not enough wind to fly. */
const FULL_WIND = 0.13;
const BREEZE = 0.035;
/** How far back from the waterline the child stands. */
const STAND_OUT = 1.3;
/** Where round the shore rings to stand for a wind from each side (the shape's +y is the world's -z): clear of the cabin, the creek, the dock and the bank paths. */
const STANDS = { north: Math.PI / 2, east: 0.75, south: -Math.PI / 2 - 0.2, west: Math.PI - 0.75 };
/** The kite's string, its length in a light and a full breeze, and how high its hands hold it. */
const STRING_LIGHT = 5.5;
const STRING_FULL = 7.5;
export const HANDS_Y = 0.95;
/** Tail bows, and how far behind the kite each trails in time, hangs below it and blows on downwind. */
export const TAIL_BOWS = 6;
const TAIL_LAG = 0.12;
const TAIL_DROP = 0.3;
const TAIL_BLOW = 0.14;

/** Out by day from spring to fall on a breezy day that is neither raining nor foggy. */
export function kiteOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season !== "winter" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) >= BREEZE;
}

function shorePoint(angle: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + STAND_OUT), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + STAND_OUT) };
}

/** Where the child stands: on the bank the wind comes from, so the kite flies downwind out over the water. */
export function kiteFlyer(wind: { x: number; z: number }): Spot {
  if (Math.abs(wind.z) >= Math.abs(wind.x)) return shorePoint(wind.z >= 0 ? STANDS.north : STANDS.south);
  return shorePoint(wind.x < 0 ? STANDS.east : STANDS.west);
}

export type KitePoint = { x: number; y: number; z: number };

/** The kite itself, `time` seconds in, in the day's `wind`. `still` holds it steady at the top of its string. */
export function kiteAt(time: number, wind: { x: number; z: number }, still = false): KitePoint {
  const flyer = kiteFlyer(wind);
  const speed = Math.hypot(wind.x, wind.z);
  const fill = Math.min(1, speed / FULL_WIND);
  const down = speed > 1e-6 ? { x: wind.x / speed, z: wind.z / speed } : { x: 0, z: 1 };
  const length = STRING_LIGHT + (STRING_FULL - STRING_LIGHT) * fill;
  const t = still ? 0 : time;
  // It climbs and sinks with the gusts and swoops across the wind, on beats that never quite repeat.
  const rise = 0.55 + 0.1 * Math.sin(t * 0.31) + 0.05 * Math.sin(t * 0.83 + 2);
  const sweep = (0.35 - 0.12 * fill) * (Math.sin(t * 0.47) + 0.4 * Math.sin(t * 1.13 + 1));
  const out = length * Math.cos(rise) * Math.cos(sweep);
  const across = length * Math.sin(sweep);
  return {
    x: flyer.x + down.x * out - down.z * across,
    y: HANDS_Y + length * Math.sin(rise) * Math.cos(sweep),
    z: flyer.z + down.z * out + down.x * across,
  };
}

/** The tail's bows, each trailing behind the one before it: below it, blown on downwind, and following where the kite has just been. */
export function kiteTail(time: number, wind: { x: number; z: number }, still = false): KitePoint[] {
  const speed = Math.hypot(wind.x, wind.z);
  const down = speed > 1e-6 ? { x: wind.x / speed, z: wind.z / speed } : { x: 0, z: 1 };
  return Array.from({ length: TAIL_BOWS }, (_, i) => {
    const lag = kiteAt(time - (still ? 0 : (i + 1) * TAIL_LAG), wind, still);
    const back = (i + 1) * TAIL_BLOW;
    return { x: lag.x + down.x * back, y: lag.y - (i + 1) * TAIL_DROP, z: lag.z + down.z * back };
  });
}
