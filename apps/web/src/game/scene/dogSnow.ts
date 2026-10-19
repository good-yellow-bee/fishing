import { CAP_BUILD_SEC, CAP_MELT_SEC } from "./capSnow";

/**
 * Snow on the dock dog's back while it falls: it builds up on the dog's jumper and, once there is a
 * good layer, the dog gives itself a shake and throws it off in a burst of flakes, then lets it build
 * again. Stepped each frame.
 */

export type DogSnow = { snow: number; shookAt: number };

export const DOG_SNOW_START: DogSnow = { snow: 0, shookAt: -Infinity };
/** How much snow lies on its back before it shakes it off. */
export const SHAKE_AT = 0.7;
/** How long a shake lasts, and how long the flakes fly. */
export const SHAKE_SEC = 0.9;
/** Its snow builds a little faster than the angler's cap: a wide flat back. */
const BUILD_SEC = CAP_BUILD_SEC * 0.6;

/** The dog's snow moved on by `delta` seconds to `time`; `falling` while snow falls; `still` never shakes. */
export function dogSnowStep(state: DogSnow, time: number, delta: number, falling: boolean, still = false): DogSnow {
  const snow = Math.min(1, Math.max(0, falling ? state.snow + delta / BUILD_SEC : state.snow - delta / CAP_MELT_SEC));
  if (!still && snow >= SHAKE_AT) return { snow: 0, shookAt: time };
  return { snow, shookAt: state.shookAt };
}

/** How hard it is shaking at `time`, -1 to 1 about its spine, dying away; 0 when it is not. */
export function dogShake(state: DogSnow, time: number) {
  const k = (time - state.shookAt) / SHAKE_SEC;
  if (k < 0 || k >= 1) return 0;
  return Math.sin(k * Math.PI * 7) * (1 - k);
}

/** Flake `i` of the burst at `time`, flung out from the dog's back and falling, in metres from it; null when none fly. */
export function shakeFlake(state: DogSnow, i: number, time: number) {
  const k = (time - state.shookAt) / SHAKE_SEC;
  if (k < 0 || k >= 1) return null;
  const angle = i * 2.39996;
  const reach = 0.35 * Math.sqrt(k);
  return { x: Math.cos(angle) * reach, y: 0.25 + 0.3 * k - 0.6 * k * k, z: Math.sin(angle) * reach * 0.6, size: 0.025 * (1 - k * 0.6) };
}
