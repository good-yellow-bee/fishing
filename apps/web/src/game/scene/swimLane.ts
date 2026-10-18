import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Someone out for a swim on a hot, clear summer's day: breaststroke up and down a lane a few
 * metres off the far bank's beach, treading water to turn at each end, their towel and bag left
 * on the sand. Pure in time.
 */

/** The lane's ends, as angles round the shore rings (the shape's +y is the world's -z), and how far out from the waterline it runs: in the shallows off the beach, inside the canoe's course and behind the swans'. */
const LANE_FROM = 1.4;
const LANE_TO = 1.05;
const LANE_IN = 1;
/** Seconds for one length of the lane, and for turning round at its end. */
export const LENGTH_SEC = 46;
export const TURN_SEC = 5;
/** Seconds for one stroke: the pull, the kick and the glide. */
export const STROKE_SEC = 1.7;
/** Where the towel lies, round the shore and back from the waterline: behind the dog walker's path. */
const TOWEL_ANGLE = 1.43;
const TOWEL_OUT = 1.7;

/** Out by day in summer, only when the sky is clear. */
export function swimmingOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "summer" && sky === "clear";
}

/** A point `out` metres back from the drawn waterline at shore angle `angle` (negative out is out in the water). */
function ring(angle: number, out: number) {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** A point along the lane, 0 at its west end and 1 at its east end. */
export function swimLane(u: number) {
  return ring(LANE_FROM + (LANE_TO - LANE_FROM) * u, -LANE_IN);
}

/** The towel on the sand, and which way it lies (its long side across the bank, its foot to the water). */
export const TOWEL_AT = (() => {
  const at = ring(TOWEL_ANGLE, TOWEL_OUT);
  const water = ring(TOWEL_ANGLE, 0);
  return { ...at, yaw: Math.atan2(water.x - at.x, water.z - at.z) };
})();

export type SwimPose = {
  x: number;
  z: number;
  /** Which way the swimmer faces; the figure faces +z. */
  yaw: number;
  /** Where they are in the stroke, 0 to 1: the arms sweep out and back to 0.4, the legs kick to 0.6, then they glide. */
  stroke: number;
  /** How far the head is lifted out of the water, 0 low in the glide to 1 at the top of the pull. */
  lift: number;
  /** 1 while swimming along, 0 while treading water at the turn. */
  going: number;
};

function heading(u: number, eastward: boolean) {
  const ahead = swimLane(Math.min(1, u + 0.01));
  const behind = swimLane(Math.max(0, u - 0.01));
  const east = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  return eastward ? east : east + Math.PI;
}

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

/** How the head rises through a stroke: up with the pull, down into the glide. */
function headLift(stroke: number) {
  return stroke < 0.4 ? Math.sin((stroke / 0.4) * Math.PI * 0.5) : Math.max(0, 1 - (stroke - 0.4) / 0.35);
}

/** The swimmer `time` seconds in. `still` holds them treading water partway along the lane. */
export function swimmerAt(time: number, still = false): SwimPose {
  if (still) return { ...swimLane(0.4), yaw: heading(0.4, true), stroke: 0.7, lift: 0.3, going: 0 };
  const lap = 2 * (LENGTH_SEC + TURN_SEC);
  const into = ((time % lap) + lap) % lap;
  const eastward = into < LENGTH_SEC + TURN_SEC;
  const legInto = eastward ? into : into - LENGTH_SEC - TURN_SEC;
  if (legInto < LENGTH_SEC) {
    // Each stroke surges them on with the kick and they slow through the glide, a little at a time.
    const strokes = LENGTH_SEC / STROKE_SEC;
    const n = (legInto / LENGTH_SEC) * strokes;
    const surge = n - Math.sin(2 * Math.PI * n) / (2 * Math.PI) * 0.6;
    const s = Math.min(1, Math.max(0, surge / strokes));
    const u = eastward ? s : 1 - s;
    // The surge peaks mid-stroke, with the kick.
    const phase = n % 1;
    return { ...swimLane(u), yaw: heading(u, eastward), stroke: phase, lift: headLift(phase), going: 1 };
  }
  // Treading water at the end of the lane, turning round to swim back.
  const end = eastward ? 1 : 0;
  const k = smooth((legInto - LENGTH_SEC) / TURN_SEC);
  return { ...swimLane(end), yaw: heading(end, eastward) + Math.PI * k, stroke: 0.7, lift: 0.35 + 0.1 * Math.sin(time * 3), going: 0 };
}
