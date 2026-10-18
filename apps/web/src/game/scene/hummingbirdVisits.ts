import { SHOP_X, SHOP_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import type { Flower } from "./meadowFlowers";

/**
 * A ruby-throated hummingbird visiting the wildflowers by the shack on summer days: it zips in,
 * hovers at a flower with its bill in it, darts to the next, and after a handful of flowers zips
 * off again, to come back a while later. Pure in time.
 */

/** Seconds from one visit to the next, and spent away before each. */
export const ROUND_SEC = 42;
const AWAY_SEC = 15;
/** Seconds to zip in or away, to hover at a flower, and to dart between flowers. */
const ZIP_SEC = 0.8;
const HOVER_SEC = 1.8;
const DART_SEC = 0.4;
export const FLOWERS_A_VISIT = 5;
/** Where it zips in from and away to: high in the big tree east of the shack. */
const PERCH = { x: SHOP_X + 3.2, y: 2.6, z: SHOP_Z + 0.6 };
/** How far in front of a flower's head it hovers, so its bill is in the flower. */
const BILL = 0.09;

/** Out by day in summer when it is neither raining nor foggy. */
export function hummingbirdOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "summer" && sky !== "rain" && sky !== "fog";
}

export type HummerPose = { x: number; y: number; z: number; yaw: number; hovering: boolean };

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(k: number) {
  return k * k * (3 - 2 * k);
}

/** Where it hovers to feed at a flower, and which way it faces: bill to the flower, from the side nearer the shack's grass. */
function feedingSpot(flower: Flower, k: number) {
  const yaw = unit(k * 3.7 + flower.x) * Math.PI * 2;
  return { x: flower.x - Math.sin(yaw) * BILL, y: flower.height + 0.02, z: flower.z - Math.cos(yaw) * BILL, yaw };
}

/** The hummingbird `time` seconds in, or null while it is away. `still` holds it hovering at its first flower. */
export function hummingbirdAt(time: number, flowers: readonly Flower[], still = false): HummerPose | null {
  if (flowers.length === 0) return null;
  const round = still ? 0 : Math.floor(time / ROUND_SEC);
  const into = still ? AWAY_SEC + ZIP_SEC + 0.5 : time - round * ROUND_SEC;
  const spots = Array.from({ length: FLOWERS_A_VISIT }, (_, k) => feedingSpot(flowers[Math.floor(unit(round * 13 + k * 5 + 1) * flowers.length)]!, round * 7 + k));
  if (into < AWAY_SEC) return null;
  let t = into - AWAY_SEC;
  const zip = (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, k: number): HummerPose => {
    const s = smooth(k);
    return { x: from.x + (to.x - from.x) * s, y: from.y + (to.y - from.y) * s, z: from.z + (to.z - from.z) * s, yaw: Math.atan2(to.x - from.x, to.z - from.z), hovering: false };
  };
  if (t < ZIP_SEC) return zip(PERCH, spots[0]!, t / ZIP_SEC);
  t -= ZIP_SEC;
  for (let k = 0; k < FLOWERS_A_VISIT; k += 1) {
    const spot = spots[k]!;
    if (t < HOVER_SEC) {
      // Hanging in the air at the flower, bobbing a touch and backing off for a moment now and then.
      const bob = Math.sin(t * 11 + k) * 0.008;
      const back = Math.max(0, Math.sin(t * 2.6 + k)) * 0.025;
      return { x: spot.x - Math.sin(spot.yaw) * back, y: spot.y + bob, z: spot.z - Math.cos(spot.yaw) * back, yaw: spot.yaw, hovering: true };
    }
    t -= HOVER_SEC;
    const next = k + 1 < FLOWERS_A_VISIT ? spots[k + 1]! : null;
    if (next && t < DART_SEC) {
      const pose = zip(spot, next, t / DART_SEC);
      // A dart is a quick hop up and over.
      return { ...pose, y: pose.y + Math.sin((t / DART_SEC) * Math.PI) * 0.12 };
    }
    if (next) t -= DART_SEC;
  }
  if (t < ZIP_SEC) return zip(spots[FLOWERS_A_VISIT - 1]!, PERCH, t / ZIP_SEC);
  return null;
}
