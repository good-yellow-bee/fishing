import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A sculler out training at dawn on calm water: a long, narrow racing shell rowed hard along the
 * far half of the lake, surging with each stroke, then spun round slowly at the end to row back.
 * Pure in time.
 */

/** The course: an arc round the far half of the lake, between these angles (world z = centre + RZ·reach·sin), this far out toward the shore. */
const COURSE_FROM = -2.2;
const COURSE_TO = -0.9;
const COURSE_REACH = 0.8;
/** Seconds to row the course one way, and to spin the shell round at its end. */
export const ROW_SEC = 22;
export const SPIN_SEC = 9;
/** Seconds for one stroke. */
export const STROKE_SEC = 2;
/** How hard each stroke surges the shell on: 0 a steady glide, 1 stopping dead between strokes. */
const SURGE = 0.55;
/** Above this wind (m/s of drift) the water is too rough to take a shell out. */
const CALM = 0.1;
/** The oars' sweep from square across the shell: reached toward the bow at the catch, pulled back past square at the finish. */
const CATCH = 0.75;
const FINISH = -0.6;

/** Out at dawn from spring to fall, on calm water that is neither rained on nor fogged in. */
export function scullOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "dawn" && season !== "winter" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) < CALM;
}

/** A point on the course, 0 at its west end and 1 at its east end. */
export function scullCourse(u: number) {
  const angle = COURSE_FROM + (COURSE_TO - COURSE_FROM) * u;
  return { x: LAKE_RX * COURSE_REACH * Math.cos(angle), z: LAKE_CENTER_Z + LAKE_RZ * COURSE_REACH * Math.sin(angle) };
}

function heading(u: number, eastward: boolean) {
  const ahead = scullCourse(Math.min(1, u + 0.01));
  const behind = scullCourse(Math.max(0, u - 0.01));
  const east = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  return eastward ? east : east + Math.PI;
}

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

export type ScullPose = {
  x: number;
  z: number;
  /** Which way the bow points; the bow is the shell's +z. */
  yaw: number;
  /** Where the stroke is, 0 to 1: the drive with the blades in the water to 0.4, the release, the recovery back up the slide to 0.95, and the catch. */
  stroke: number;
  /** 1 rowing along the course, 0 spinning round at its end. */
  going: number;
};

/** The sculler `time` seconds in. `still` holds the shell gliding partway along the course, blades just out of the water. */
export function scullAt(time: number, still = false): ScullPose {
  if (still) return { ...scullCourse(0.45), yaw: heading(0.45, true), stroke: 0.5, going: 1 };
  const lap = 2 * (ROW_SEC + SPIN_SEC);
  const into = ((time % lap) + lap) % lap;
  const eastward = into < ROW_SEC + SPIN_SEC;
  const legInto = eastward ? into : into - ROW_SEC - SPIN_SEC;
  if (legInto < ROW_SEC) {
    const strokes = ROW_SEC / STROKE_SEC;
    const n = legInto / STROKE_SEC;
    // The shell runs fastest mid-drive (a fifth of the way into the stroke) and slows through the recovery.
    const surged = n - (SURGE * Math.sin(2 * Math.PI * (n - 0.2 + 0.5))) / (2 * Math.PI);
    const shift = (SURGE * Math.sin(2 * Math.PI * 0.3)) / (2 * Math.PI);
    // Easing off the start and into the end of the course, so the shell does not jolt into or out of the spin.
    const ease = smooth(legInto / 2.5) * smooth((ROW_SEC - legInto) / 2.5);
    const s = Math.min(1, Math.max(0, (surged + shift) / strokes));
    const u = eastward ? s : 1 - s;
    return { ...scullCourse(u), yaw: heading(u, eastward), stroke: ease > 0.5 ? n % 1 : 0.5, going: 1 };
  }
  // Spinning round at the end: short strokes, one oar pulling and the other backing.
  const end = eastward ? 1 : 0;
  const k = smooth((legInto - ROW_SEC) / SPIN_SEC);
  return { ...scullCourse(end), yaw: heading(end, eastward) + Math.PI * k, stroke: ((legInto - ROW_SEC) / STROKE_SEC) % 1, going: 0 };
}

/** The oars' sweep from square through the stroke (positive is toward the bow). */
export function oarSweep(stroke: number) {
  if (stroke < 0.4) return CATCH + (FINISH - CATCH) * smooth(stroke / 0.4);
  if (stroke < 0.5) return FINISH;
  if (stroke < 0.95) return FINISH + (CATCH - FINISH) * smooth((stroke - 0.5) / 0.45);
  return CATCH;
}

/** How high the blades are carried: 0 buried in the water through the drive, 1 clear of it on the recovery. */
export function bladeUp(stroke: number) {
  if (stroke < 0.4) return 0;
  if (stroke < 0.5) return smooth((stroke - 0.4) / 0.1);
  if (stroke < 0.93) return 1;
  return 1 - smooth((stroke - 0.93) / 0.07);
}

/** Where the rower is on the sliding seat: 1 coiled up toward the stern at the catch, 0 legs flat at the finish. */
export function slideAt(stroke: number) {
  if (stroke < 0.4) return 1 - smooth(stroke / 0.3);
  if (stroke < 0.5) return 0;
  return smooth((stroke - 0.5) / 0.45);
}
