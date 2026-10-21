import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { BIN_AT, BIN_HEIGHT, BIN_INSIDE, BIN_WALL } from "./binWorms";
import type { RobinPose } from "./robinVisit";
import { smoothstep, visitAt } from "./visitClock";

/**
 * A blackbird that now and then raids the shack's worm bin: it flies in from the trees, lands on the crate's
 * left wall, looks about, dips its bill into the soil, tugs a worm up leaning back, and flies off with it
 * dangling. Dawn and day, spring to fall, not in the rain (that's when it's out on the bank). Pure in time.
 */

type Point = { x: number; y: number; z: number };

/** It is drawn at this size, a little smaller than the bank blackbird, beside the crate. */
export const BIN_BIRD_SCALE = 2;
/** The bill's tip from the bird's feet, up and forward, before scaling (DockRobin's head and bill). */
export const BILL = { up: 0.098, out: 0.052 };
/** On the middle of the crate's left wall, facing in across the soil (+x). */
export const PERCH: Point = { x: BIN_AT.x - BIN_INSIDE.width / 2 - BIN_WALL / 2, y: BIN_AT.y + BIN_HEIGHT, z: BIN_AT.z };
const PERCH_YAW = Math.PI / 2;
/** The soil's top in the crate. */
export const SOIL_Y = BIN_AT.y + BIN_HEIGHT - 0.02;
/** How far it bows to put its bill to the soil, and leans back as it tugs, in radians. */
export const DIP_PITCH = 1.17;
const LEAN_PITCH = -0.3;
/** The worm's length once it is out, hanging from the bill, meters. */
export const HELD_WORM = 0.09;
const FROM: Point = { x: PERCH.x - 3.2, y: PERCH.y + 1.5, z: PERCH.z - 1.2 };
const TO: Point = { x: PERCH.x - 2.6, y: PERCH.y + 2.6, z: PERCH.z - 3.4 };

export const BIN_VISIT_EVERY_SEC = 75;
const FIRST_SEC = 16;
const IN_SEC = 1.8;
const LOOK_SEC = 3.2;
const DIP_SEC = 0.45;
const TUG_SEC = 1.6;
const HOLD_SEC = 1.3;
const OUT_SEC = 1.9;
export const BIN_VISIT_SEC = IN_SEC + LOOK_SEC + DIP_SEC + TUG_SEC + HOLD_SEC + OUT_SEC;

/** Dawn and day, spring to fall, when it isn't raining. */
export function binBirdOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dawn" || hour === "day") && season !== "winter" && sky !== "rain";
}

export const binVisit = (time: number) => visitAt(time, FIRST_SEC, BIN_VISIT_EVERY_SEC);

/** Where the bill's tip is, up and forward of the feet in meters, with the bird bowed by `pitch`. */
export function billAt(pitch: number) {
  return {
    up: BIN_BIRD_SCALE * (BILL.up * Math.cos(pitch) - BILL.out * Math.sin(pitch)),
    out: BIN_BIRD_SCALE * (BILL.up * Math.sin(pitch) + BILL.out * Math.cos(pitch)),
  };
}

export type BinBirdPose = RobinPose & { pitch: number; worm: number; wormSway: number };

const away: Omit<BinBirdPose, "here"> = { ...PERCH, yaw: PERCH_YAW, flying: 0, look: 0, flick: 0, pitch: 0, worm: 0, wormSway: 0 };
const perched = (look = 0, flick = 0, pitch = 0, worm = 0, wormSway = 0): BinBirdPose => ({ ...PERCH, here: true, yaw: PERCH_YAW, flying: 0, look, flick, pitch, worm, wormSway });

function fly(from: Point, to: Point, t: number, arc: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t + arc * Math.sin(Math.PI * t), z: from.z + (to.z - from.z) * t };
}

const heading = (a: Point, b: Point) => Math.atan2(b.x - a.x, b.z - a.z);

/** The blackbird `time` seconds in; `still` keeps it perched on the rim looking in, with no worm. */
export function binBirdAt(time: number, still = false): BinBirdPose {
  if (still) return perched();
  const { index, into } = binVisit(time);
  if (index < 0 || into >= BIN_VISIT_SEC) return { ...away, here: false };
  const look = IN_SEC;
  const dip = look + LOOK_SEC;
  const tug = dip + DIP_SEC;
  const hold = tug + TUG_SEC;
  const off = hold + HOLD_SEC;
  const wormSway = Math.sin(into * 8) * 0.35;
  if (into < look) {
    const p = smoothstep(into / IN_SEC);
    return { ...fly(FROM, PERCH, p, 0.3), here: true, yaw: p > 0.92 ? PERCH_YAW : heading(FROM, PERCH), flying: 1, look: 0, flick: 0, pitch: 0, worm: 0, wormSway: 0 };
  }
  // Head cocked this way and that, listening for worms, the tail flicking now and then.
  if (into < dip) return perched(0.7 * Math.sin(Math.round(into / 0.8) * 2.3), Math.max(0, Math.sin(into * 2.1) ** 12));
  if (into < tug) return perched(0, 0, DIP_PITCH * smoothstep((into - dip) / DIP_SEC));
  if (into < hold) {
    // Three jerks back as it leans away, the worm stretched from the soil to its bill, then pulled clear.
    const k = (into - tug) / TUG_SEC;
    const pitch = DIP_PITCH + (LEAN_PITCH - DIP_PITCH) * smoothstep(k / 0.7) - 0.15 * Math.max(0, Math.sin(k * Math.PI * 6)) * (1 - k);
    const stretched = Math.max(0, billAt(pitch).up + PERCH.y - SOIL_Y);
    const worm = k < 0.7 ? stretched : stretched + (HELD_WORM - stretched) * smoothstep((k - 0.7) / 0.3);
    return perched(0, 0, pitch, worm, wormSway * 0.3);
  }
  if (into < off) return perched(0, Math.max(0, Math.sin(into * 2.1) ** 12), 0, HELD_WORM, wormSway);
  const p = smoothstep((into - off) / OUT_SEC);
  return { ...fly(PERCH, TO, p, 0.4), here: true, yaw: heading(PERCH, TO), flying: 1, look: 0, flick: 0, pitch: 0, worm: HELD_WORM, wormSway };
}
