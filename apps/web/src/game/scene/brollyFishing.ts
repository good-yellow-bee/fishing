import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type Sky } from "@stillwater/shared";

/**
 * An angler sitting it out on the far bank in the rain under a big green fishing umbrella tipped
 * into the weather, the rod propped on its rests over the water. Now and then they sip from a
 * flask cup; now and then the float bobs and the rod tip nods, and they lean in to watch, but
 * it comes to nothing. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where round the shore rings they sit (the shape's +y is the world's -z) and how far back from the water. */
const SEAT_ANGLE = 0.88;
const SEAT_OUT = 0.9;
/** The rod: how far in front of the seat its butt rests, its length and its lift above level. */
const ROD_BUTT = 0.45;
const ROD_BUTT_Y = 0.35;
export const ROD_LENGTH = 3;
export const ROD_LIFT = 0.42;
/** How far out from the rod tip the float sits on the water. */
const FLOAT_OUT = 2.4;
/** The umbrella's most tip, into the windiest rain. */
const MAX_TILT = 0.38;
const FULL_WIND = 0.13;

/** One round of the wait, and when in it the sip and the bite come. */
export const BROLLY_ROUND_SEC = 32;
const SIP_AT = 7;
const SIP_SEC = 3.2;
const BITE_AT = 19;
const BITE_SEC = 2.4;
const LEAN_SEC = 5;

/** Out in the rain at dawn and by day. */
export function brollyOut(hour: LakeHour, sky: Sky | undefined) {
  return sky === "rain" && (hour === "dawn" || hour === "day");
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** Where they sit, and which way they face: out over the water, turned from the lake's middle toward the dock to cast clear of the rock. */
export const SEAT_AT = shorePoint(SEAT_ANGLE, SEAT_OUT);
export const SEAT_YAW = Math.atan2(0 - SEAT_AT.x, LAKE_CENTER_Z - SEAT_AT.z) + 0.45;
const AHEAD = { x: Math.sin(SEAT_YAW), z: Math.cos(SEAT_YAW) };
/** The rod's butt on its back rest, and its tip at rest out over the water. */
export const ROD_BASE = { x: SEAT_AT.x + AHEAD.x * ROD_BUTT, y: ROD_BUTT_Y, z: SEAT_AT.z + AHEAD.z * ROD_BUTT };
const REST_TIP = {
  x: ROD_BASE.x + AHEAD.x * ROD_LENGTH * Math.cos(ROD_LIFT),
  y: ROD_BASE.y + ROD_LENGTH * Math.sin(ROD_LIFT),
  z: ROD_BASE.z + AHEAD.z * ROD_LENGTH * Math.cos(ROD_LIFT),
};
export const FLOAT_AT = { x: REST_TIP.x + AHEAD.x * FLOAT_OUT, z: REST_TIP.z + AHEAD.z * FLOAT_OUT };

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** The umbrella's lean: its top tipped toward where the rain blows from, further the windier it is. */
export function brollyTilt(wind: { x: number; z: number }): { x: number; z: number } {
  const speed = Math.hypot(wind.x, wind.z);
  if (speed < 1e-6) return { x: 0, z: 0 };
  const amount = Math.min(1, speed / FULL_WIND) * MAX_TILT;
  return { x: (-wind.x / speed) * amount, z: (-wind.z / speed) * amount };
}

export type BrollyPose = {
  /** The cup at the lips, 0 resting in the lap to 1 raised. */
  sip: number;
  /** How far they lean in to watch the float, 0 to 1. */
  lean: number;
  /** How far the rod tip nods down, in radians, and the float dips under, in meters. */
  nod: number;
  dip: number;
};

/** The angler, rod and float `time` seconds in. `still` keeps them sitting quietly with nothing biting. */
export function brollyAt(time: number, still = false): BrollyPose {
  if (still) return { sip: 0, lean: 0, nod: 0, dip: 0 };
  const t = ((time % BROLLY_ROUND_SEC) + BROLLY_ROUND_SEC) % BROLLY_ROUND_SEC;
  const s = t - SIP_AT;
  const sip = s < 0 || s > SIP_SEC ? 0 : smooth(s / 0.8) * (1 - smooth((s - (SIP_SEC - 0.8)) / 0.8));
  const b = t - BITE_AT;
  // A few sharp nods, dying away.
  const biting = b > 0 && b < BITE_SEC;
  const shake = biting ? Math.max(0, Math.sin((b / BITE_SEC) * Math.PI * 5)) * (1 - b / BITE_SEC) : 0;
  const lean = b < -0.5 || b > LEAN_SEC ? 0 : smooth((b + 0.5) / 0.6) * (1 - smooth((b - (LEAN_SEC - 1.4)) / 1.4));
  return { sip, lean, nod: shake * 0.09, dip: shake * 0.05 };
}

/** The rod tip, nodded down by `nod` radians. */
export function rodTip(nod: number) {
  const lift = ROD_LIFT - nod;
  return {
    x: ROD_BASE.x + AHEAD.x * ROD_LENGTH * Math.cos(lift),
    y: ROD_BASE.y + ROD_LENGTH * Math.sin(lift),
    z: ROD_BASE.z + AHEAD.z * ROD_LENGTH * Math.cos(lift),
  };
}
