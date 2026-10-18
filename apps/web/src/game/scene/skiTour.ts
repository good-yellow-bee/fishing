import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A cross-country skier out on a winter's day, striding along the far bank one way, turning
 * round at the end of the track, and striding back. Pure in time.
 */

/** The track's ends, as angles round the shore rings (the shape's +y is the world's -z, so these lie on the far, north side). */
const TRACK_FROM = 1.9;
const TRACK_TO = 0.95;
/** How far back from the waterline the track runs: over the snowy sand, in front of the cabin and the bank trees. */
const TRACK_OUT = 1.2;
/** Seconds for one run along the track, and for turning round at its end. */
export const RUN_SEC = 30;
export const TURN_SEC = 4;
/** Metres the skier travels in one full stride (left and right). */
const STRIDE_M = 2.6;

/** Out by day in winter, unless it is raining or foggy. */
export function skiingOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "winter" && sky !== "rain" && sky !== "fog";
}

/** A point on the track, 0 at its west end and 1 at its east end. */
export function skiTrack(u: number) {
  const angle = TRACK_FROM + (TRACK_TO - TRACK_FROM) * u;
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + TRACK_OUT), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + TRACK_OUT) };
}

/** The track's length in metres. */
export const TRACK_LENGTH = Array.from({ length: 64 }, (_, i) => {
  const a = skiTrack(i / 64);
  const b = skiTrack((i + 1) / 64);
  return Math.hypot(b.x - a.x, b.z - a.z);
}).reduce((sum, step) => sum + step, 0);

export type SkiPose = {
  x: number;
  z: number;
  /** Which way the skier faces; the skis point along +z. */
  yaw: number;
  /** Where the legs are through a stride: 1 the left leg reached forward, -1 the right. */
  stride: number;
  /** How hard the skier is pushing on, 0 standing to 1 at full stride. */
  effort: number;
};

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

function heading(u: number, eastward: boolean) {
  const ahead = skiTrack(Math.min(1, u + 0.01));
  const behind = skiTrack(Math.max(0, u - 0.01));
  const east = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  return eastward ? east : east + Math.PI;
}

/** The skier `time` seconds in. `still` holds them standing partway along the track. */
export function skiAt(time: number, still = false): SkiPose {
  if (still) {
    const here = skiTrack(0.4);
    return { ...here, yaw: heading(0.4, true), stride: 0, effort: 0 };
  }
  const lap = 2 * (RUN_SEC + TURN_SEC);
  const into = ((time % lap) + lap) % lap;
  const eastward = into < RUN_SEC + TURN_SEC;
  const runInto = eastward ? into : into - RUN_SEC - TURN_SEC;
  if (runInto < RUN_SEC) {
    // Pushing off from the turn, gliding steadily, and easing up into the next.
    const k = runInto / RUN_SEC;
    const s = k - Math.sin(2 * Math.PI * k) / (2 * Math.PI);
    const u = eastward ? s : 1 - s;
    const here = skiTrack(u);
    const effort = 0.5 - 0.5 * Math.cos(2 * Math.PI * k);
    // The legs keep pace with the ground covered, so the skis never slide without a stride.
    const stride = Math.sin((2 * Math.PI * s * TRACK_LENGTH) / STRIDE_M) * effort;
    return { ...here, yaw: heading(u, eastward), stride, effort };
  }
  // Turning round at the end of the track: a few small steps round on the spot.
  const k = smooth((runInto - RUN_SEC) / TURN_SEC);
  const end = eastward ? 1 : 0;
  const here = skiTrack(end);
  const from = heading(end, eastward);
  const steps = Math.sin(((runInto - RUN_SEC) / TURN_SEC) * Math.PI * 6) * 0.15 * Math.sin(k * Math.PI);
  return { ...here, yaw: from + Math.PI * k, stride: steps, effort: 0 };
}
