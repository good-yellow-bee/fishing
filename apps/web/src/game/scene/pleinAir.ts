import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A painter at an easel on the far bank on a calm, clear day, under a white sun umbrella. They dab
 * at the canvas, now and then stepping back to look at the lake and back at the work, and the
 * picture fills in over a few minutes: the sky first, then the far bank, then the water. Then
 * they start a fresh canvas. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where round the shore rings they set up (the shape's +y is the world's -z) and how far back from the water. */
const PAINTER_ANGLE = 1.7;
const PAINTER_OUT = 2.3;
/** How far in front of them the easel stands. */
export const EASEL_REACH = 0.75;
/** Below this drift there is no wind to speak of: a painter's day. */
const CALM = 0.02;

/** The seconds one dab of the brush takes, and between steps back to look. */
const DAB_SEC = 1.7;
const LOOK_EVERY = 15;
const STEP_SEC = 1.1;
const LOOK_SEC = 2.6;
/** How far they step back to look. */
export const STEP_BACK = 0.55;
/** One canvas, start to finish. */
export const PAINT_SEC = 240;

/** Out by day from spring to fall, under a clear sky with no wind. */
export function painterOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season !== "winter" && sky === "clear" && Math.hypot(wind.x, wind.z) < CALM;
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/**
 * Where the painter stands at work, and which way they face: north-east, their back half turned to the water, painting the hills,
 * so the canvas turns its face to the dock across the lake.
 */
export const PAINTER_AT = shorePoint(PAINTER_ANGLE, PAINTER_OUT);
export const PAINTER_YAW = Math.atan2(1, -1);
export const EASEL_AT = { x: PAINTER_AT.x + Math.sin(PAINTER_YAW) * EASEL_REACH, z: PAINTER_AT.z + Math.cos(PAINTER_YAW) * EASEL_REACH };
/** The umbrella, planted beside them on the side away from the lake. */
export const UMBRELLA_AT = { x: PAINTER_AT.x + Math.cos(PAINTER_YAW) * 0.55, z: PAINTER_AT.z - Math.sin(PAINTER_YAW) * 0.55 };

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export type PainterPose = {
  /** How far stepped back from the easel, in meters (0 at work). */
  back: number;
  /** The brush arm's reach toward the canvas, 0 resting to 1 touching. */
  dab: number;
  /** How far the head tips to one side as they look, 0 to 1. */
  tilt: number;
};

/** The painter `time` seconds in. `still` keeps them at the easel with the brush lifted. */
export function painterAt(time: number, still = false): PainterPose {
  if (still) return { back: 0, dab: 0.4, tilt: 0 };
  const t = ((time % LOOK_EVERY) + LOOK_EVERY) % LOOK_EVERY;
  const look = LOOK_EVERY - (STEP_SEC * 2 + LOOK_SEC);
  if (t >= look) {
    const u = t - look;
    const away = u < STEP_SEC ? smooth(u / STEP_SEC) : u < STEP_SEC + LOOK_SEC ? 1 : 1 - smooth((u - STEP_SEC - LOOK_SEC) / STEP_SEC);
    const tilt = u < STEP_SEC || u > STEP_SEC + LOOK_SEC ? 0 : Math.sin(((u - STEP_SEC) / LOOK_SEC) * Math.PI);
    return { back: away * STEP_BACK, dab: 0, tilt };
  }
  // Each dab reaches in quickly and draws back slowly, easing in from a rest at the start of the stretch.
  const phase = (t % DAB_SEC) / DAB_SEC;
  const stroke = phase < 0.3 ? smooth(phase / 0.3) : 1 - smooth((phase - 0.3) / 0.7);
  return { back: 0, dab: stroke * smooth(t / 0.8) * smooth((look - t) / 0.8), tilt: 0 };
}

export type CanvasFill = { sky: number; bank: number; water: number };

/** How much of each band of the picture is painted, 0 to 1, `time` seconds in. `still` shows it half done. */
export function canvasFill(time: number, still = false): CanvasFill {
  const t = still ? PAINT_SEC * 0.55 : ((time % PAINT_SEC) + PAINT_SEC) % PAINT_SEC;
  const u = t / PAINT_SEC;
  const band = (from: number) => Math.min(1, Math.max(0, (u - from) / 0.28));
  return { sky: band(0.04), bank: band(0.34), water: band(0.64) };
}
