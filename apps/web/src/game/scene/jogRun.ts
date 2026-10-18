import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { PATH_LENGTH, walkPath } from "./dogWalk";

/**
 * A jogger out on winter days, bundled up, running the far bank end to end and back along the
 * sand below the skier's track, jogging on the spot as they turn round at each end. Pure in time.
 */

/** Running pace in metres a second, and the metres in one full stride (left and right). */
const PACE = 2.6;
const STRIDE_M = 2.2;
/** How far back from the waterline they run: on the sand, between the water and the ski track. */
const JOG_OUT = 0.3;
/** Seconds to run the path one way, and to turn round, jogging on the spot, at each end. */
export const RUN_SEC = PATH_LENGTH / PACE;
export const TURN_SEC = 1.4;
/** Strides a second, running along the path and jogging on the spot alike. */
export const CADENCE = PACE / STRIDE_M;

/** Out by day in winter, unless it is snowing or foggy: the dog walker's path is theirs while the walker stays home. */
export function joggerOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "winter" && sky !== "rain" && sky !== "fog";
}

/** A point on the run, 0 at the west end and 1 at the east, along the dog walker's path but nearer the water. */
export function jogPath(u: number) {
  return walkPath(u, JOG_OUT);
}

function heading(u: number, eastward: boolean) {
  const ahead = jogPath(Math.min(1, u + 0.01));
  const behind = jogPath(Math.max(0, u - 0.01));
  const east = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  return eastward ? east : east + Math.PI;
}

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

export type JogPose = {
  x: number;
  z: number;
  yaw: number;
  /** Where the legs are through a stride, -1 to 1. */
  stride: number;
  /** How hard they are running: 1 at full pace, less jogging on the spot at the turn. */
  pace: number;
};

/** The jogger `time` seconds in. `still` stands them mid-path mid-stride. */
export function joggerAt(time: number, still = false): JogPose {
  if (still) {
    const here = jogPath(0.5);
    return { ...here, yaw: heading(0.5, true), stride: 0.3, pace: 1 };
  }
  const lap = 2 * (RUN_SEC + TURN_SEC);
  const into = ((time % lap) + lap) % lap;
  const eastward = into < RUN_SEC + TURN_SEC;
  const leg = eastward ? into : into - RUN_SEC - TURN_SEC;
  // The legs keep their beat all round the lap: running strides along the path, the same beat on the spot.
  const beat = time * CADENCE * 2 * Math.PI;
  if (leg < RUN_SEC) {
    const s = leg / RUN_SEC;
    const u = eastward ? s : 1 - s;
    return { ...jogPath(u), yaw: heading(u, eastward), stride: Math.sin(beat), pace: 1 };
  }
  const end = eastward ? 1 : 0;
  const turn = (leg - RUN_SEC) / TURN_SEC;
  return { ...jogPath(end), yaw: heading(end, eastward) + Math.PI * smooth(turn), stride: Math.sin(beat), pace: 1 - 0.45 * Math.sin(Math.PI * turn) };
}
