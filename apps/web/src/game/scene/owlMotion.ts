import type { LakeHour, LakeSeason } from "@stillwater/shared";

/** The bare tree on the far bank, and the branch tip the owl sits on. */
export const OWL_TREE = { x: -4.5, z: -18.2 } as const;
export const OWL_PERCH = { x: -4.1, y: 3.1, z: -18.2 } as const;
/** Seconds the owl looks one way before it turns its head again. */
export const LOOK_SEC = 4;
/** How long a turn of the head takes. */
export const TURN_SEC = 0.35;
/** Seconds the body bobs with a hoot. */
export const HOOT_BOB_SEC = 1.2;

/** On its branch after dark, all but winter. */
export function owlOut(hour: LakeHour, season: LakeSeason): boolean {
  return hour === "night" && season !== "winter";
}

function hash(i: number) {
  const s = Math.sin(i * 61.3 + 23.9) * 43758.5453;
  return s - Math.floor(s);
}

/** Where the head points in look `k`: mostly toward the lake, now and then a hard look aside. */
function look(k: number) {
  const roll = hash(k);
  if (roll < 0.5) return 0;
  return (roll < 0.75 ? -1 : 1) * (0.6 + hash(k + 0.5) * 0.9);
}

/** The head's turn from facing the lake, in radians, at `time`. `still` keeps it facing the lake, for reduced motion. */
export function owlHead(time: number, still = false): number {
  if (still) return 0;
  const k = Math.floor(time / LOOK_SEC);
  const into = time - k * LOOK_SEC;
  const to = look(k);
  if (into >= TURN_SEC) return to;
  // A quick, owlish snap from the last look to this one.
  const u = into / TURN_SEC;
  return look(k - 1) + (to - look(k - 1)) * u * u * (3 - 2 * u);
}

/** How far the body dips `since` seconds after a hoot started: two little bows, one per note. */
export function hootBob(since: number): number {
  if (since < 0 || since >= HOOT_BOB_SEC) return 0;
  return Math.abs(Math.sin((since / HOOT_BOB_SEC) * Math.PI * 2)) * 0.06;
}
