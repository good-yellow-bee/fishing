import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, type LakeHour, type Sky } from "@stillwater/shared";
import type { ScenePhase } from "./types";

/**
 * The angler's dog: by day, when it is not raining, a golden dog lies on the dock just behind
 * and to the left of the angler, facing the water. It watches the line after a cast and dozes off,
 * head on its paws, when nothing happens for a while. A strike brings it up sitting, ears up and
 * tail going, through the fight, and it wags hard over the result before lying back down.
 */

/** Out by day in any season, but it stays home in the rain. */
export function dogOut(hour: LakeHour, sky: Sky | undefined) {
  return hour === "day" && sky !== "rain";
}

/** Where it lies: on the left of the boards behind the angler, clear of the thermos on the right. */
export const DOG_SPOT = { x: DOCK_STAND_X - 0.4, y: DOCK_PLANKS.top, z: DOCK_STAND_Z + 0.78 } as const;
/** Facing out over the water, as a yaw for a model facing +z. */
export const DOG_YAW = Math.PI;
/** Seconds of nothing happening before it dozes off, idle and while the line sits. */
export const DOZE_IDLE_SEC = 25;
export const DOZE_WAIT_SEC = 45;
/** Seconds it wags over a result before it lies back down. */
export const CHEER_SEC = 6;

export type DogMood = {
  /** Sat up on its front legs, 0 lying to 1 sitting. */
  sit: number;
  /** Its head, 0 down on its paws asleep to 1 up and watching. */
  headUp: number;
  /** How hard its tail goes, 0 still to 1 thrashing. */
  wag: number;
};

/** What the dog is doing `since` seconds into the angler's current `phase`. */
export function dogMood(phase: ScenePhase, since: number): DogMood {
  switch (phase) {
    case "casting":
      return { sit: 0, headUp: 1, wag: 0.3 };
    case "waiting":
      // Watching the float at first, then losing interest, then asleep.
      return since < DOZE_WAIT_SEC / 2 ? { sit: 0, headUp: 1, wag: 0.1 } : since < DOZE_WAIT_SEC ? { sit: 0, headUp: 0.6, wag: 0 } : { sit: 0, headUp: 0, wag: 0 };
    case "hookset":
      return { sit: 1, headUp: 1, wag: 0.6 };
    case "fight":
      return { sit: 1, headUp: 1, wag: 0.8 };
    case "result":
      return since < CHEER_SEC ? { sit: 1, headUp: 1, wag: 1 } : { sit: 0, headUp: 0.8, wag: 0.2 };
    case "idle":
    default:
      return since < DOZE_IDLE_SEC ? { sit: 0, headUp: 0.8, wag: 0.15 } : { sit: 0, headUp: 0, wag: 0 };
  }
}

/** Eases `from` toward `to` over a frame of `delta` seconds; a dog sits up quicker than it lies down. */
export function easeMood(from: DogMood, to: DogMood, delta: number): DogMood {
  const step = (a: number, b: number, rate: number) => a + (b - a) * (1 - Math.exp(-rate * delta));
  return {
    sit: step(from.sit, to.sit, to.sit > from.sit ? 6 : 1.5),
    headUp: step(from.headUp, to.headUp, to.headUp > from.headUp ? 5 : 0.8),
    wag: step(from.wag, to.wag, 3),
  };
}

/** The tail's swing at `time` for a wag of `wag`, in radians: quicker as well as wider the happier it is. */
export function tailSwing(time: number, wag: number) {
  return wag * 0.6 * Math.sin(time * (4 + 10 * wag));
}

/** A glance aside now and then while it is awake, in radians, as a pure function of time. */
export function dogGlance(time: number) {
  const slow = Math.sin(time * 0.37) + 0.6 * Math.sin(time * 0.91 + 1.3);
  return 0.4 * Math.max(-1, Math.min(1, slow * 0.9));
}

/** How far round it will turn its head to watch something, either way, in radians. */
export const DOG_LOOK_MAX = 0.9;
/** Past this far round, it does not bother looking. */
const DOG_LOOK_LIMIT = 1.5;

/**
 * The head turn, relative to lying facing the water, that looks at the point (`x`, `z`), held to
 * DOG_LOOK_MAX; null when the point is too far round behind it to bother.
 */
export function dogLookAt(x: number, z: number): number | null {
  const raw = Math.atan2(x - DOG_SPOT.x, z - DOG_SPOT.z) - DOG_YAW;
  const rel = Math.atan2(Math.sin(raw), Math.cos(raw));
  return Math.abs(rel) > DOG_LOOK_LIMIT ? null : Math.max(-DOG_LOOK_MAX, Math.min(DOG_LOOK_MAX, rel));
}

/** How far it cocks its head to one side, radians, when a nibble at the float catches its ear. */
export const DOG_COCK = 0.35;

/** A nibble at the float wakes it: head right up and a small hopeful wag. */
export function noticing(mood: DogMood): DogMood {
  return { ...mood, headUp: 1, wag: Math.max(mood.wag, 0.25) };
}

type Spot = { x: number; z: number };

/**
 * What the dog attends to, given its `calm` mood: a nibble at the float (`nibbling`, the float at `float`)
 * before the robin (`bird`) before a paper boat (`boat`). Its head turn (null for none), its mood, and
 * whether it cocks its head, as it does at a nibble.
 */
export function dogAttention(calm: DogMood, nibbling: Spot | null, bird: Spot | null, boat: Spot | null): { turn: number | null; mood: DogMood; cock: boolean } {
  if (nibbling) return { turn: dogLookAt(nibbling.x, nibbling.z) ?? 0, mood: calm.sit > 0 ? calm : noticing(calm), cock: true };
  const turn = bird ? dogLookAt(bird.x, bird.z) : boat ? dogLookAt(boat.x, boat.z) : null;
  return { turn, mood: turn !== null && calm.sit === 0 ? watching(calm) : calm, cock: false };
}

/** Something worth watching lifts its head, unless it is sat up already for a bite. */
export function watching(mood: DogMood): DogMood {
  return { ...mood, headUp: Math.max(mood.headUp, 0.9) };
}
