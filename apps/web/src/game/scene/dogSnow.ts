import { CAP_BUILD_SEC, capSnow } from "./capSnow";

/**
 * Snow on the dock dog's back while it falls: it builds up on the dog's jumper and, once there is a
 * good layer, the dog gives itself a shake while it lies there and throws it off in a burst of flakes,
 * then lets it build again; once the snow stops, what is left melts away. Stepped each frame.
 */

/** The snow on its back now, when it last shook, and how much it threw off then. */
export type DogSnow = { snow: number; shookAt: number; thrown: number };

export const DOG_SNOW_START: DogSnow = { snow: 0, shookAt: -Infinity, thrown: 0 };
/** How much snow lies on its back before it shakes it off. */
export const SHAKE_AT = 0.7;
/** How long a shake lasts and the flakes fly, and how soon the layer is gone from its back. */
export const SHAKE_SEC = 0.9;
const THROW_SEC = 0.25;
/** Its snow builds a little faster than the angler's cap: a wide flat back. */
const BUILD_SEC = CAP_BUILD_SEC * 0.6;

/**
 * The dog's snow moved on by `delta` seconds to `time`; `falling` while snow falls. It shakes only when
 * `free` (lying calm, not sat up for a bite), and never when `still`. Returns `state` itself when nothing changed.
 */
export function dogSnowStep(state: DogSnow, time: number, delta: number, falling: boolean, free: boolean, still = false): DogSnow {
  const snow = capSnow(state.snow, delta, falling, BUILD_SEC);
  if (free && !still && snow >= SHAKE_AT) return { snow: 0, shookAt: time, thrown: snow };
  return snow === state.snow ? state : { ...state, snow };
}

/** How much snow shows on its back at `time`: what lies there, and what it is throwing off, going in a moment. */
export function dogSnowShown(state: DogSnow, time: number) {
  const k = (time - state.shookAt) / THROW_SEC;
  return state.snow + (k >= 0 && k < 1 ? state.thrown * (1 - k) : 0);
}

/** How hard it is shaking at `time`, -1 to 1 about its spine, dying away; 0 when it is not. */
export function dogShake(state: DogSnow, time: number) {
  const k = (time - state.shookAt) / SHAKE_SEC;
  if (k < 0 || k >= 1) return 0;
  return Math.sin(k * Math.PI * 7) * (1 - k);
}

/** Flake `i` of the burst at `time`, flung out from the dog's back and falling, in metres from where it lies; null when none fly. */
export function shakeFlake(state: DogSnow, i: number, time: number) {
  const k = (time - state.shookAt) / SHAKE_SEC;
  if (k < 0 || k >= 1) return null;
  const angle = i * 2.39996;
  const reach = 0.4 * Math.sqrt(k);
  return { x: Math.cos(angle) * reach, y: 0.3 + 0.35 * k - 0.7 * k * k, z: Math.sin(angle) * reach * 0.6 - 0.05, size: 0.03 * (1 - k * 0.6) };
}
