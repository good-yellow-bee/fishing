import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type Sky } from "@stillwater/shared";

/**
 * A red fox at dusk and after dark: now and then it slips out of the trees on
 * the far bank, trots along the water's edge, stops to look across at the
 * dock, trots on and slips back into the trees. Each visit runs the other way.
 * Pure functions of time.
 */
export const FOX_CYCLE_SEC = 95;
export const FOX_FIRST_SEC = 20;
export const FOX_OUT_SEC = 2.5;
export const FOX_TROT_SEC = 12;
export const FOX_LOOK_SEC = 5;
export const FOX_TROT_ON_SEC = 9;
export const FOX_VISIT_SEC = FOX_OUT_SEC + FOX_TROT_SEC + FOX_LOOK_SEC + FOX_TROT_ON_SEC + FOX_OUT_SEC;
/** The stretch of far bank it runs, angles round the lake (−π/2 is due north), west of where the deer drinks. */
const FROM_ANGLE = -Math.PI / 2 - 1.0;
const TO_ANGLE = -Math.PI / 2 - 0.05;
/** At the water's edge, and back in the trees. */
const EDGE = 1.03;
const WOODS = 1.3;
/** Leg swing per second at a trot. */
const TROT_RATE = 11;

export function foxOut(hour: LakeHour, sky: Sky | undefined) {
  return (hour === "dusk" || hour === "night") && sky !== "rain";
}

export type FoxPose = {
  x: number;
  z: number;
  yaw: number;
  /** Leg swing phase, radians; constant while it stands. */
  gait: number;
  /** 0 looking where it goes, 1 head turned to look across the lake. */
  look: number;
  hidden: boolean;
};

function smooth(u: number) {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

function bank(angle: number, reach: number) {
  return { x: Math.cos(angle) * LAKE_RX * reach, z: LAKE_CENTER_Z + Math.sin(angle) * LAKE_RZ * reach };
}

function heading(from: { x: number; z: number }, to: { x: number; z: number }) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** The fox at `time`. `still` keeps it standing, for reduced motion. */
export function foxAt(time: number, still = false): FoxPose {
  const shifted = time - FOX_FIRST_SEC;
  const visit = Math.floor(shifted / FOX_CYCLE_SEC);
  let into = shifted - visit * FOX_CYCLE_SEC;
  const away: FoxPose = { ...bank(FROM_ANGLE, WOODS), yaw: 0, gait: 0, look: 0, hidden: true };
  if (shifted < 0 || into >= FOX_VISIT_SEC) return away;
  const forward = visit % 2 === 0;
  const start = forward ? FROM_ANGLE : TO_ANGLE;
  const end = forward ? TO_ANGLE : FROM_ANGLE;
  // Where along the bank it stops to look.
  const pause = start + (end - start) * (FOX_TROT_SEC / (FOX_TROT_SEC + FOX_TROT_ON_SEC));
  const stride = (t: number) => (still ? 0 : t * TROT_RATE);
  const along = (a: number, b: number, u: number) => {
    const angle = a + (b - a) * u;
    const here = bank(angle, EDGE);
    const ahead = bank(angle + Math.sign(b - a) * 0.01, EDGE);
    return { ...here, yaw: heading(here, ahead) };
  };

  if (into < FOX_OUT_SEC) {
    const u = smooth(into / FOX_OUT_SEC);
    const from = bank(start, WOODS);
    const to = bank(start, EDGE);
    return { x: from.x + (to.x - from.x) * u, z: from.z + (to.z - from.z) * u, yaw: heading(from, to), gait: stride(into), look: 0, hidden: false };
  }
  into -= FOX_OUT_SEC;
  if (into < FOX_TROT_SEC) return { ...along(start, pause, into / FOX_TROT_SEC), gait: stride(into), look: 0, hidden: false };
  into -= FOX_TROT_SEC;
  if (into < FOX_LOOK_SEC) {
    const look = Math.min(smooth(into / 0.8), smooth((FOX_LOOK_SEC - into) / 0.8));
    return { ...along(start, pause, 1), gait: 0, look, hidden: false };
  }
  into -= FOX_LOOK_SEC;
  if (into < FOX_TROT_ON_SEC) return { ...along(pause, end, into / FOX_TROT_ON_SEC), gait: stride(into), look: 0, hidden: false };
  into -= FOX_TROT_ON_SEC;
  const u = smooth(into / FOX_OUT_SEC);
  const from = bank(end, EDGE);
  const to = bank(end, WOODS);
  return { x: from.x + (to.x - from.x) * u, z: from.z + (to.z - from.z) * u, yaw: heading(from, to), gait: stride(into), look: 0, hidden: false };
}
