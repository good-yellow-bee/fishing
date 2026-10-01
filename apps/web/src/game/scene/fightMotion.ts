/** How long the strike whip takes before the rod settles into the fight. */
export const HOOKSET_SEC = 0.74;

/** The upward snap inside the hookset. */
export const STRIKE_SNAP_SEC = 0.28;

/** Pause at the top of the set so the strike reads. */
export const STRIKE_HOLD_SEC = 0.16;

/** Bobber yank toward the angler on the strike. */
export const TUG_SEC = 0.32;

/** Air time of a hooked fish leaving the water. */
export const FISH_LEAP_SEC = 0.52;

export type FightSurge = 0 | 1 | 2;

export type RodInput = {
  tension: number;
  surge: FightSurge;
  reeling: boolean;
  /** Seconds since the strike. Negative while the bite is still on. */
  strikeAge: number;
  biteAge: number;
  time: number;
  /** Retrieve cycle, advances only while reeling. */
  pump: number;
  /** Rod pitch captured at the moment of the strike. */
  fromPitch: number;
};

/** Written by the game loop. The scene reads it on the next frame. */
export const fightInput = { reeling: false };

/** Shared pose so the rod, line, and fish agree on one fight. */
export const fightView = {
  active: false,
  surge: 0 as FightSurge,
  tension: 0.2,
  reeling: false,
  strikeAge: -1,
  biteAge: 0,
  pump: 0,
  time: 0,
  runSide: 0,
  lead: 0.32,
  side: 0,
  depth: 0.16,
  leapAge: -1,
  tug: 0,
  plunge: 0,
  pull: 0,
  sag: 0.22,
};

/** 0 at the start of a pump, 1 at the top, 0 after the drop. */
export function reelPumpLift(phase: number) {
  const u = phase - Math.floor(phase);
  if (u < 0.62) return Math.sin((u / 0.62) * (Math.PI / 2));
  return Math.cos(((u - 0.62) / 0.38) * (Math.PI / 2));
}

/** Bite loads the rod down toward the water. */
export function biteRodPitch(biteAge: number, time: number) {
  const load = 1.14 + Math.min(0.4, Math.max(0, biteAge) * 2.1);
  return load + Math.sin(time * 23) * 0.055;
}

/** Tension and a run bend the tip down. A pump lifts it. */
export function loadedFightPitch(
  tension: number,
  surge: FightSurge,
  reeling: boolean,
  pump: number,
  time: number,
) {
  const t = Math.min(1, Math.max(0, tension));
  const base = 1.04 + t * 0.56;
  const run = surge === 2 ? 0.36 : surge === 1 ? 0.09 : 0;
  const shiver = surge === 2 ? Math.sin(time * 27) * 0.04 : surge === 1 ? Math.sin(time * 19) * 0.028 : 0;
  const lift = reeling ? reelPumpLift(pump) * (surge === 2 ? 0.12 : 0.4) : 0;
  return base + run + shiver - lift;
}

const SET_UP = 0.4;

/** Snap from the loaded bite up through the hookset, hold, then settle. */
export function strikeRodPitch(age: number, from: number, loaded: number) {
  if (age <= STRIKE_SNAP_SEC) {
    const u = Math.max(0, age) / STRIKE_SNAP_SEC;
    const e = 1 - (1 - u) ** 2;
    return from + (SET_UP - from) * e;
  }
  const held = STRIKE_SNAP_SEC + STRIKE_HOLD_SEC;
  if (age <= held) return SET_UP;
  const u = (age - held) / (HOOKSET_SEC - held);
  const damp = Math.exp(-2.6 * Math.max(0, u));
  const settle = SET_UP + (loaded - SET_UP) * (1 - Math.exp(-3.4 * Math.max(0, u)));
  return settle + Math.sin(u * Math.PI * 2.2) * 0.06 * damp;
}

export function fightRodPitch(input: RodInput) {
  const loaded = loadedFightPitch(input.tension, input.surge, input.reeling, input.pump, input.time);
  if (input.strikeAge < 0) return biteRodPitch(input.biteAge, input.time);
  if (input.strikeAge < HOOKSET_SEC) return strikeRodPitch(input.strikeAge, input.fromPitch, loaded);
  return loaded;
}

/** Tip twists toward a side run. Positive runSide rolls positive. */
export function fightRodRoll(surge: FightSurge, runSide: number, time: number, strikeAge: number, biteAge: number) {
  const pull = runSide * (surge === 2 ? 0.26 : surge === 1 ? 0.1 : 0.03);
  let shake = 0;
  if (strikeAge < 0) shake = Math.sin(biteAge * 26) * 0.08;
  else if (surge === 1) shake = Math.sin(time * 22) * 0.07;
  else if (surge === 2) shake = Math.sin(time * 16) * 0.035;
  const snap = strikeAge >= 0 && strikeAge < STRIKE_SNAP_SEC ? Math.sin((strikeAge / STRIKE_SNAP_SEC) * Math.PI) * 0.1 : 0;
  return pull + shake + snap;
}

/** Negative leans back (the set, a pump). Positive is the fish dragging you forward. */
export function fightBodyLean(surge: FightSurge, reeling: boolean, strikeAge: number) {
  let lean = 0;
  if (strikeAge < 0) lean += 0.1;
  else if (strikeAge < STRIKE_SNAP_SEC + STRIKE_HOLD_SEC) {
    const u = Math.min(1, Math.max(0, strikeAge) / STRIKE_SNAP_SEC);
    lean -= 0.28 * (1 - (1 - u) ** 2);
  } else if (strikeAge < HOOKSET_SEC) {
    const u = (strikeAge - STRIKE_SNAP_SEC - STRIKE_HOLD_SEC) / (HOOKSET_SEC - STRIKE_SNAP_SEC - STRIKE_HOLD_SEC);
    lean -= 0.28 * (1 - Math.min(1, Math.max(0, u)));
  }
  if (reeling && surge !== 2) lean -= 0.11;
  if (surge === 2) lean += 0.16;
  return lean;
}

/** How far the fish leads the lure, meters, along the cast. */
export function fishLeadMeters(surge: FightSurge, reeling: boolean) {
  if (surge === 2) return reeling ? 0.78 : 1.28;
  if (surge === 1) return 0.5;
  return reeling ? 0.14 : 0.38;
}

/** Lateral lead. runSide is about -1..1. */
export function fishSideMeters(surge: FightSurge, runSide: number) {
  const reach = surge === 2 ? 0.95 : surge === 1 ? 0.32 : 0.06;
  return runSide * reach;
}

export function fishDepthMeters(surge: FightSurge) {
  if (surge === 2) return 0.34;
  if (surge === 1) return 0.24;
  return 0.16;
}

/** 0..1 arc. Zero outside the leap. */
export function fishLeapHeight(age: number) {
  if (age < 0 || age >= FISH_LEAP_SEC) return 0;
  return Math.sin((age / FISH_LEAP_SEC) * Math.PI) * 1.15;
}

/** 0 at the ends of the strike yank, 1 in the middle. */
export function hooksetTug(strikeAge: number) {
  if (strikeAge < 0 || strikeAge > TUG_SEC) return 0;
  return Math.sin((strikeAge / TUG_SEC) * Math.PI);
}

export function bobberPlunge(biteAge: number, strikeAge: number, surge: FightSurge) {
  if (strikeAge < 0) return 0.08 + Math.abs(Math.sin(Math.max(0, biteAge) * 17)) * 0.07;
  return hooksetTug(strikeAge) * 0.18 + (surge === 2 ? 0.11 : 0);
}

/** How far the lure is dragged along the run, meters. */
export function bobberPull(surge: FightSurge, reeling: boolean) {
  if (surge === 2) return reeling ? 0.22 : 0.5;
  if (surge === 1) return 0.12;
  return 0;
}

/**
 * Belly of the line. Never deeper than a slack fight (0.54), so the drape
 * stays off the dock. A run or a pump lifts that belly.
 */
export function fightLineSag(tension: number, surge: FightSurge, reeling: boolean, pump: number) {
  const slack = 0.04 + Math.max(0, 1 - tension) * 0.5;
  if (surge === 2) return Math.min(slack, 0.05);
  if (!reeling) return slack;
  const lift = reelPumpLift(pump);
  return slack * (0.85 - lift * 0.45);
}
