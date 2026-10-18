import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A little sailing dinghy out on the east side of the lake on breezy days: it reaches back and forth
 * between two marks, going about at each end, heeled over by the wind with its boom out on the lee
 * side, further the stronger the breeze. Pure in time.
 */

type Spot = { x: number; z: number };

/** The two ends of its run, out on open water north-east of the dock where it shows from the dock, clear of the canoe's far-shore route, the open-water fishing spot and the drop-off's casting water. */
export const SAIL_FROM: Spot = { x: 5.5, z: -9.5 };
export const SAIL_TO: Spot = { x: 13, z: -5.5 };
/** Seconds for one leg, and for going about at the end of it. */
export const LEG_SEC = 46;
export const TACK_SEC = 5;
/** The drift (m/s) of a full breeze, as the windsock's; below `BREEZE` there is not enough wind to sail. */
const FULL_WIND = 0.13;
const BREEZE = 0.035;
/** How far it heels in a full breeze, in radians, and how far out the boom swings. */
const MAX_HEEL = 0.32;
const BOOM_OUT = 0.6;

/** Out by day from spring to fall when there is a breeze and it is neither raining nor foggy. */
export function sailingOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season !== "winter" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) >= BREEZE;
}

export type SailPose = {
  x: number;
  z: number;
  /** Which way the bow points; the bow is +z. */
  yaw: number;
  /** Lean about the bow-to-stern line: positive rolls the mast toward the boat's -x side. */
  heel: number;
  /** The boom's swing about the mast from straight aft: positive swings it toward -x. */
  boom: number;
};

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

/** Which side the wind blows the sail and boat toward, in the boat's own x: 1 for +x, -1 for -x. */
function leeSide(yaw: number, wind: { x: number; z: number }) {
  const across = wind.x * Math.cos(yaw) - wind.z * Math.sin(yaw);
  return across >= 0 ? 1 : -1;
}

/** The dinghy `time` seconds in, in the day's `wind`. `still` holds it partway along its first leg. */
export function sailAt(time: number, wind: { x: number; z: number }, still = false): SailPose {
  const lap = 2 * (LEG_SEC + TACK_SEC);
  const into = still ? LEG_SEC * 0.4 : ((time % lap) + lap) % lap;
  const outward = into < LEG_SEC + TACK_SEC;
  const legInto = outward ? into : into - LEG_SEC - TACK_SEC;
  const [from, to] = outward ? [SAIL_FROM, SAIL_TO] : [SAIL_TO, SAIL_FROM];
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  const fill = Math.min(1, Math.hypot(wind.x, wind.z) / FULL_WIND);
  // A gust now and then leans it over a little further.
  const gust = still ? 0 : 0.06 * Math.max(0, Math.sin(time * 0.37) * Math.sin(time * 1.3));
  const lean = MAX_HEEL * (0.35 + 0.65 * fill) + gust;
  if (legInto < LEG_SEC) {
    // Gathering way from the last tack and slowing into the next.
    const s = 0.5 - 0.5 * Math.cos((legInto / LEG_SEC) * Math.PI);
    const lee = leeSide(yaw, wind);
    // Rolls toward the lee side: a positive heel tips toward -x, so lee +x needs a negative heel.
    return { x: from.x + (to.x - from.x) * s, z: from.z + (to.z - from.z) * s, yaw, heel: -lee * lean, boom: -lee * BOOM_OUT };
  }
  // Going about: it swings round through the wind on the spot, coming upright as the boom crosses.
  const k = smooth((legInto - LEG_SEC) / TACK_SEC);
  const back = yaw + Math.PI;
  const turned = yaw + (back - yaw) * k;
  const leeBefore = leeSide(yaw, wind);
  const leeAfter = leeSide(back, wind);
  const swing = 1 - Math.sin(k * Math.PI);
  const lee = leeBefore + (leeAfter - leeBefore) * k;
  return { x: to.x, z: to.z, yaw: turned, heel: -lee * lean * swing, boom: -lee * BOOM_OUT };
}
