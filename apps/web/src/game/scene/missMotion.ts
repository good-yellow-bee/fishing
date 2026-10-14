/** How long the tip takes to reach the top of the release. */
export const MISS_WHIP_SEC = 0.2;

/** How long the bobber takes to crest above the float. */
export const MISS_POP_SEC = 0.16;

/** Waiting-rod pitch the tip rings back to. */
const TIP_REST = 1.05;

/** How far above the rest pose the tip whips, in radians. */
const TIP_OVERSHOOT = 0.62;

export const missView = {
  active: false,
  age: -1,
  fromSag: 0.05,
  fromPlunge: 0.3,
  x: 0,
  z: 0,
};

const MISS_VIEW_START = { ...missView };

export function resetMissView() {
  Object.assign(missView, MISS_VIEW_START);
}

/**
 * Loaded tip whips up past the rest pose, rings, then settles.
 * Age 0 is the pitch the bite left behind.
 */
export function missRodPitch(age: number, fromPitch: number) {
  const peak = TIP_REST - TIP_OVERSHOOT;
  if (age <= 0) return fromPitch;
  if (age <= MISS_WHIP_SEC) {
    const u = age / MISS_WHIP_SEC;
    return fromPitch + (peak - fromPitch) * (1 - (1 - u) ** 3);
  }
  const u = age - MISS_WHIP_SEC;
  const damp = Math.exp(-2.2 * u);
  const settle = 1 - Math.exp(-2.8 * u);
  const base = peak + (TIP_REST - peak) * settle;
  const ring = Math.sin((u / 0.34) * Math.PI * 2) * 0.28 * damp;
  return base + ring;
}

/** Sideways kick dying out after the tip lets go. */
export function missRodRoll(age: number, fromRoll: number) {
  const u = Math.max(0, age);
  return fromRoll * Math.cos(u * 22) * Math.exp(-5 * u);
}

/** Forward lean drops, with a rock back as the tip springs. */
export function missBodyLean(age: number, fromLean: number) {
  const u = Math.max(0, age);
  const recover = fromLean * Math.exp(-9 * u);
  const rock = -Math.sin(Math.min(1, u / 0.22) * Math.PI) * 0.2;
  const fade = u < 0.22 ? 1 : Math.exp(-3.5 * (u - 0.22));
  return recover + rock * fade;
}

/** Belly of the line. Starts at the tight bite and drops into a slack loop. */
export function missLineSag(age: number, fromSag: number) {
  if (age <= 0) return fromSag;
  const u = Math.min(1, age / 0.32);
  const slack = 0.9;
  const drop = fromSag + (slack - fromSag) * (1 - (1 - u) ** 2);
  const swing = Math.sin(age * 8) * 0.05 * Math.exp(-1.8 * age);
  return drop + swing;
}

/**
 * Meters above the resting float. Negative while the bobber is still under.
 * Crests clear of the surface, then settles on the float.
 */
export function missBobberLift(age: number, fromPlunge: number) {
  const dunk = Math.max(0, fromPlunge);
  const crest = 0.34;
  if (age <= 0) return -dunk;
  if (age <= MISS_POP_SEC) {
    const u = age / MISS_POP_SEC;
    const e = 1 - (1 - u) ** 2;
    return -dunk + (dunk + crest) * e;
  }
  const u = age - MISS_POP_SEC;
  const damp = Math.exp(-3.5 * u);
  const settle = crest * Math.exp(-6 * u);
  const ring = Math.sin((u / 0.28) * Math.PI * 2) * 0.09 * damp;
  return settle + ring;
}

/** Drops shaken off the bobber as it pops clear on a miss. */
export const MISS_DRIPS = 6;
const DRIP_FIRST = 0.1;
const DRIP_GAP = 0.06;
const DRIP_GRAVITY = 9.8;

function dripUnit(i: number, salt: number) {
  const s = Math.sin(i * 51.3 + salt * 9.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Drop `i` at `age` into the miss, as metres off the float's spot and height
 * above it, or null before it lets go and once it is back in the water.
 */
export function missDrip(i: number, age: number, fromPlunge: number) {
  const release = DRIP_FIRST + i * DRIP_GAP;
  if (age < release) return null;
  const fall = age - release;
  const y = 0.07 + missBobberLift(release, fromPlunge) - 0.5 * DRIP_GRAVITY * fall * fall;
  if (y <= 0) return null;
  const spread = 0.03 + fall * 0.25;
  return { x: (dripUnit(i, 1) - 0.5) * spread, y, z: (dripUnit(i, 2) - 0.5) * spread };
}

