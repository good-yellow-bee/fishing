import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A night angler on the middle of the far bank, sitting by a rod on its rests with a glowing
 * green float out on the dark water. Their headlamp's beam follows where they look: out at the
 * float, down at the tackle box beside them, along the water now and then. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where round the shore rings they sit (the shape's +y is the world's -z) and how far back from the water. */
const SEAT_ANGLE = 1.48;
const SEAT_OUT = 0.9;
/** The rod: how far ahead of the seat its butt rests, its length and its lift above level. */
const ROD_BUTT = 0.45;
export const ROD_BUTT_Y = 0.35;
export const ROD_LENGTH = 2.8;
export const ROD_LIFT = 0.4;
/** How far out past the rod tip the float sits. */
const FLOAT_OUT = 2.6;

/** Out at dusk and at night from spring to fall, unless it is raining or foggy. */
export function headlampOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dusk" || hour === "night") && season !== "winter" && sky !== "rain" && sky !== "fog";
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** Where they sit, facing straight out toward the lake's middle. */
export const SEAT_AT = shorePoint(SEAT_ANGLE, SEAT_OUT);
export const SEAT_YAW = Math.atan2(0 - SEAT_AT.x, LAKE_CENTER_Z - SEAT_AT.z);
const AHEAD = { x: Math.sin(SEAT_YAW), z: Math.cos(SEAT_YAW) };
export const BUTT_AHEAD = ROD_BUTT;
const TIP_AHEAD = ROD_BUTT + ROD_LENGTH * Math.cos(ROD_LIFT);
export const ROD_TIP = { x: SEAT_AT.x + AHEAD.x * TIP_AHEAD, y: ROD_BUTT_Y + ROD_LENGTH * Math.sin(ROD_LIFT), z: SEAT_AT.z + AHEAD.z * TIP_AHEAD };
export const FLOAT_AT = { x: SEAT_AT.x + AHEAD.x * (TIP_AHEAD + FLOAT_OUT), z: SEAT_AT.z + AHEAD.z * (TIP_AHEAD + FLOAT_OUT) };
/** The tackle box on the ground beside them, on their right. */
export const BOX_SIDE = -0.55;
export const BOX_AHEAD = 0.2;

/** The head's turn (yaw, + to their left) and tilt (pitch, + up) when looking at each thing. */
const LOOKS = {
  float: { yaw: 0, pitch: -0.22 },
  box: { yaw: -1.15, pitch: -1.0 },
  left: { yaw: 0.55, pitch: -0.18 },
} as const;
/** The round of looks: where, and for how long, with a turn between each. */
const PLAN = [
  { at: "float", sec: 9 },
  { at: "box", sec: 4 },
  { at: "float", sec: 6 },
  { at: "left", sec: 2.5 },
] as const;
const TURN_SEC = 0.9;
export const LOOK_ROUND_SEC = PLAN.reduce((sum, step) => sum + step.sec + TURN_SEC, 0);

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export type HeadLook = { yaw: number; pitch: number };

/** Where the head, and so the beam, is pointing `time` seconds in. `still` keeps it on the float. */
export function headlampLook(time: number, still = false): HeadLook {
  if (still) return { ...LOOKS.float };
  let t = ((time % LOOK_ROUND_SEC) + LOOK_ROUND_SEC) % LOOK_ROUND_SEC;
  for (let i = 0; i < PLAN.length; i += 1) {
    const step = PLAN[i]!;
    const here = LOOKS[step.at];
    if (t < step.sec) return { ...here };
    t -= step.sec;
    if (t < TURN_SEC) {
      const next = LOOKS[PLAN[(i + 1) % PLAN.length]!.at];
      const s = smooth(t / TURN_SEC);
      return { yaw: here.yaw + (next.yaw - here.yaw) * s, pitch: here.pitch + (next.pitch - here.pitch) * s };
    }
    t -= TURN_SEC;
  }
  return { ...LOOKS.float };
}

/** The float's green glow, steady but for a slow breathing as the light stick swims. */
export function floatGlow(time: number, still = false) {
  return still ? 1 : 0.85 + 0.15 * Math.sin(time * 0.9);
}
