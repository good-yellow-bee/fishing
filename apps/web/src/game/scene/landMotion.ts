/** Seconds to swing a landed fish from the water into the hand. */
export const LAND_SWING_SEC = 0.92;

/** Lift after the grab, so the fish is shown instead of dropped on the grip. */
export const LAND_PRESENT_SEC = 0.4;

/** How long the exit ring lives. */
export const LAND_EXIT_SEC = 0.48;

export const LAND_DRIPS = 4;

/**
 * Off-hand hold, meters in angler space: x right, y up, z forward.
 * The fish lies across the front of the hands. It stays forward of the chest
 * (the body is about 0.4 m thick) and biased to his right, which reads on
 * screen-left of the follow camera, clear of his back.
 */
const HAND = { x: 0.64, y: 1.32, z: 0.84 };

const HOIST_SEC = 0.36;
const HOIST_PITCH = -0.22;
const REST_PITCH = 0.55;

export const landView = {
  active: false,
  age: -1,
  swing: 0,
  haulYaw: 0,
  presentYaw: 0,
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** 0 in the water, 1 in the hand. Heavy at the surface, then it comes in. */
export function landSwing(age: number) {
  const u = clamp01(age / LAND_SWING_SEC);
  if (u < 0.18) return (u / 0.18) * 0.08;
  const v = clamp01((u - 0.18) / 0.82);
  return 0.08 + (1 - (1 - v) ** 1.65) * 0.92;
}

/** Meters above the chord. Zero at the water and in the hand, high enough to clear the dock lip. */
export function landLift(swing: number) {
  const p = clamp01(swing);
  return Math.sin(Math.PI * p ** 0.8) * 1.15;
}

/** Extra meters up once the hand has the fish. Zero during the swing. */
export function landPresent(age: number) {
  if (age < LAND_SWING_SEC) return 0;
  const u = clamp01((age - LAND_SWING_SEC) / LAND_PRESENT_SEC);
  const raised = 1 - (1 - u) ** 2;
  const settle = u > 0.55 ? ((u - 0.55) / 0.45) * 0.05 : 0;
  return raised * 0.2 - settle;
}

/**
 * Nose climbs as the fish leaves the water, then levels across the hands.
 * Stays within a partial turn — the old landing spun the body two and a half times.
 */
export function landFishPitch(swing: number) {
  const p = clamp01(swing);
  // Negative pitch is nose-up. The fish climbs out, then rests a little nose-up in the hand.
  const leave = -0.22;
  const held = -0.3;
  const climb = Math.sin(p * Math.PI) * -0.7;
  return leave + (held - leave) * p + climb;
}

/** Head (+Z) to the angler's right, screen-left of the follow camera, so the flank shows. */
export function landPresentYaw(anglerYaw: number) {
  return Math.atan2(Math.cos(anglerYaw), -Math.sin(anglerYaw));
}

/** Haul in head-first, then yaw into the hold. One turn, along the short arc. */
export function landFishYaw(swing: number, haulYaw: number, presentYaw: number) {
  const u = clamp01(swing) ** 2;
  let diff = presentYaw - haulYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return haulYaw + diff * u;
}

/** Bank on the way in. In the hand, the tail flop rocks the body. */
export function landFishRoll(swing: number, age: number, time: number) {
  const p = clamp01(swing);
  if (p < 0.999) return Math.sin(Math.PI * p) * 0.5 * (1 - p * 0.35);
  return Math.sin(time * 14) * 0.2 * Math.min(1, landFlop(age));
}

/** Hard thrash in the air, then a couple of beats that die in the hand. */
export function landFlop(age: number) {
  if (age < 0) return 0;
  if (age < LAND_SWING_SEC) return 1.2;
  const u = (age - LAND_SWING_SEC) / 1.4;
  if (u >= 1.8) return 0.1;
  const beats = Math.abs(Math.sin(u * Math.PI * 2));
  return 0.1 + Math.exp(-1.7 * u) * (0.3 + 0.7 * beats);
}

/** Rod sweeps up to lift the fish, then drops aside once the hand takes it. */
export function landRodPitch(age: number, fromPitch: number) {
  if (age <= HOIST_SEC) {
    const u = Math.max(0, age) / HOIST_SEC;
    const e = 1 - (1 - u) ** 2;
    return fromPitch + (HOIST_PITCH - fromPitch) * e;
  }
  const u = Math.min(1, (age - HOIST_SEC) / 0.75);
  const e = 1 - Math.exp(-3.2 * u);
  const shiver = Math.sin(u * Math.PI * 2) * 0.035 * (1 - u);
  return HOIST_PITCH + (REST_PITCH - HOIST_PITCH) * e + shiver;
}

/** Negative leans back. Peaks as the fish swings in, then settles into the hold. */
export function landBodyLean(age: number) {
  const u = clamp01(age / LAND_SWING_SEC);
  const back = -0.26 * Math.sin(u * Math.PI * 0.92);
  if (age <= LAND_SWING_SEC) return back;
  const v = clamp01((age - LAND_SWING_SEC) / 0.45);
  const settle = -0.07;
  return back + (settle - back) * (1 - (1 - v) ** 2);
}

export function landHoldPoint(
  out: { x: number; y: number; z: number },
  anglerX: number,
  anglerY: number,
  anglerZ: number,
  yaw: number,
  age: number,
) {
  const present = landPresent(age);
  const back = Math.max(0, -landBodyLean(age));
  const lx = HAND.x;
  const ly = HAND.y + present + back * 0.2;
  const lz = HAND.z - back * 0.12;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  out.x = anglerX + fx * lz + rx * lx;
  out.y = anglerY + ly;
  out.z = anglerZ + fz * lz + rz * lx;
}

/** Swing position. At swing 1 this is the hold, with no leftover arc. */
export function placeLandedFish(
  out: { x: number; y: number; z: number },
  from: { x: number; y: number; z: number },
  hold: { x: number; y: number; z: number },
  swing: number,
) {
  const p = clamp01(swing);
  out.x = from.x + (hold.x - from.x) * p;
  out.y = from.y + (hold.y - from.y) * p + landLift(p);
  out.z = from.z + (hold.z - from.z) * p;
}

/** Vertical shiver once the fish is in the hand. */
export function landHoldShake(age: number, time: number) {
  if (age < LAND_SWING_SEC) return 0;
  return Math.sin(time * 17) * 0.035 * landFlop(age);
}

/** Tight on the hoist, gone once the hand closes. */
export function landLineOpacity(swing: number) {
  const p = clamp01(swing);
  if (p < 0.78) return 0.72;
  return Math.max(0, 0.72 * (1 - (p - 0.78) / 0.22));
}

/** Belly while the fish is still on the line. Stays well under a slack fight. */
export function landLineSag(swing: number) {
  const p = clamp01(swing);
  return (1 - p) * 0.14 + Math.sin(p * Math.PI) * 0.06;
}

/** -1 hidden. 0..1 while that drop is falling. */
export function landDrip(age: number, index: number) {
  const start = 0.16 + index * 0.13;
  const dur = 0.42;
  const u = (age - start) / dur;
  if (u < 0 || u > 1) return -1;
  return u;
}

/** Meters the drop has fallen. */
export function landDripFall(u: number) {
  return u * u * 0.9;
}

/** -1 hidden. 0..1 ring growth after the fish leaves the surface. */
export function landExitSplash(age: number) {
  if (age < 0 || age >= LAND_EXIT_SEC) return -1;
  return age / LAND_EXIT_SEC;
}
