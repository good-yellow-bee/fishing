import type { LakeHour, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * A little railway along the foot of the hills behind the far bank: a steam train of an engine and two
 * carriages comes out of a tunnel at one end, puffs along the hillside and goes into the tunnel at the
 * other, then after a while comes back the other way. Its carriage windows are lit after dark. Pure in time.
 */

/** Out in any weather but fog, which hides the hills. */
export function trainOut(sky: Sky | undefined) {
  return sky !== "fog";
}

/** The carriage windows glow from dusk to dawn. */
export function windowsLit(hour: LakeHour) {
  return hour !== "day";
}

/** The tunnel mouths, west and east, and the track's height on the hills' face, below the fields and the sled run. */
export const PORTAL_WEST = -12;
export const PORTAL_EAST = 7.4;
export const TRACK_Y = 0.95;
/** Each car's length, the coupling gap between them, and their height: the face is found up to that height. */
export const CAR_LENGTH = 0.75;
const GAP = 0.08;
export const CAR_HEIGHT = 0.36;
/** The engine and its two carriages. */
export const CARS = 3;
const TRAIN_LENGTH = CARS * CAR_LENGTH + (CARS - 1) * GAP;
/** How far in front of the hills' face the train runs, and the tunnel mouths stand. */
export const TRACK_OUT = 0.15;
export const PORTAL_OUT = 0.32;
/** Metres a second along the line; seconds to cross from tunnel to tunnel, fully in to fully in; seconds between runs. */
const SPEED = 0.6;
export const RUN_SEC = (PORTAL_EAST - PORTAL_WEST + TRAIN_LENGTH) / SPEED;
const WAIT_SEC = 45;
export const LOOP_SEC = 2 * (RUN_SEC + WAIT_SEC);

/** The front-most face at `x` over a car's length and height on the track. */
export function hillFaceAt(x: number) {
  let face = -30;
  for (const dx of [-CAR_LENGTH / 2, 0, CAR_LENGTH / 2]) {
    for (const dy of [0, CAR_HEIGHT]) face = Math.max(face, hillFront(x + dx, TRACK_Y + dy) ?? -30);
  }
  return face;
}

/** The track's place in front of the face at `x`: the front-most face over a car's length and height there. */
export function trackZ(x: number) {
  return hillFaceAt(x) + TRACK_OUT;
}

export type CarPose = { x: number; y: number; z: number; /** Facing, about the vertical: π/2 east, -π/2 west. */ yaw: number };

/** Where the engine's front is, and which way the train is going, at `time`: null while it waits in a tunnel. */
function head(time: number, still: boolean) {
  if (still) return { front: (PORTAL_WEST + PORTAL_EAST) / 2 + TRAIN_LENGTH / 2, dir: 1 as const };
  const t = ((time % LOOP_SEC) + LOOP_SEC) % LOOP_SEC;
  const leg = RUN_SEC + WAIT_SEC;
  const dir = t < leg ? 1 : -1;
  const u = t % leg;
  if (u >= RUN_SEC) return null;
  return dir === 1 ? { front: PORTAL_WEST + SPEED * u, dir } : { front: PORTAL_EAST - SPEED * u, dir };
}

/**
 * Car `i` (0 the engine) at `time`, or null while it is inside a tunnel. A car vanishes once its middle
 * passes a tunnel mouth, which covers it. `still` holds the train halfway along, heading east.
 */
export function carAt(i: number, time: number, still = false): CarPose | null {
  const at = head(time, still);
  if (!at) return null;
  const x = at.front - at.dir * (i * (CAR_LENGTH + GAP) + CAR_LENGTH / 2);
  if (x <= PORTAL_WEST || x >= PORTAL_EAST) return null;
  // Following the hillside's curve: facing along the track's line here.
  const step = 0.2;
  const slope = (trackZ(x + step) - trackZ(x - step)) / (2 * step);
  return { x, y: TRACK_Y, z: trackZ(x), yaw: Math.atan2(at.dir, at.dir * slope) };
}

/** Puffs of steam from the engine's chimney, and how long each lives. */
export const PUFFS = 6;
export const PUFF_SEC = 3;
/** The chimney's place on the engine, ahead of its middle and above the track. */
const CHIMNEY_AHEAD = 0.24;
const CHIMNEY_UP = 0.36;

export type Puff = { x: number; y: number; z: number; /** 0 just out of the chimney to 1 gone. */ age: number };

/** Steam puff `j` at `time`: let out from the chimney where the engine was, rising and drifting with the wind. Null while none is out. */
export function puffAt(j: number, time: number, wind: { x: number; z: number }, still = false): Puff | null {
  const born = still ? time - (j / PUFFS) * PUFF_SEC : Math.floor((time - (j / PUFFS) * PUFF_SEC) / PUFF_SEC) * PUFF_SEC + (j / PUFFS) * PUFF_SEC;
  const engine = carAt(0, still ? 0 : born, still);
  if (!engine) return null;
  const age = Math.min(1, (still ? (j / PUFFS) * PUFF_SEC : time - born) / PUFF_SEC);
  const along = { x: Math.sin(engine.yaw), z: Math.cos(engine.yaw) };
  return {
    x: engine.x + along.x * CHIMNEY_AHEAD + wind.x * 8 * age,
    y: engine.y + CHIMNEY_UP + 0.5 * age,
    z: engine.z + along.z * CHIMNEY_AHEAD + 0.05,
    age,
  };
}
