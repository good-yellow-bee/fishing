import type { LakeHour, LakeSeason } from "@stillwater/shared";

/** The loon's loop on open water, clear of the dock and the banks the angler casts from. */
export const LOON_LOOP = { x: 1.5, z: -9.5, rx: 7, rz: 3.2 };
/** Radians a second it paddles around the loop. */
const PADDLE_RATE = 0.035;
/** One dive cycle: on the surface, tipping under, swimming underwater, coming up. */
export const LOON_SURFACE_SEC = 22;
export const LOON_TIP_SEC = 0.6;
export const LOON_UNDER_SEC = 5;
export const LOON_RISE_SEC = 0.6;
const CYCLE = LOON_SURFACE_SEC + LOON_TIP_SEC + LOON_UNDER_SEC + LOON_RISE_SEC;
/** Extra radians it covers underwater, so it comes up well along the loop from where it went down. */
const UNDER_REACH = 0.7;
/** Seconds the head stays up after a call. */
export const LOON_CALL_SEC = 2.6;

export type LoonPose = {
  x: number;
  z: number;
  yaw: number;
  /** 0 riding the surface, 1 fully under. */
  under: number;
  /** Nose-down tip while it dives, and the lift as it comes up, in radians. */
  pitch: number;
  /** The ring where it went down or came up, 0..1 as it spreads; -1 when there is none. */
  ring: number;
};

/** Out on the water at dusk and through the night, but not over winter ice. */
export function loonOut(hour: LakeHour, season: LakeSeason) {
  return (hour === "dusk" || hour === "night") && season !== "winter";
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function angleAt(time: number) {
  const cycles = Math.floor(time / CYCLE);
  const into = time - cycles * CYCLE;
  const under = clamp01((into - LOON_SURFACE_SEC - LOON_TIP_SEC) / LOON_UNDER_SEC);
  return time * PADDLE_RATE + (cycles + under) * UNDER_REACH;
}

export function loonPose(time: number): LoonPose {
  const angle = angleAt(time);
  const x = LOON_LOOP.x + Math.cos(angle) * LOON_LOOP.rx;
  const z = LOON_LOOP.z + Math.sin(angle) * LOON_LOOP.rz;
  // Heading along the loop: the derivative of the ellipse at this angle.
  const yaw = Math.atan2(-Math.sin(angle) * LOON_LOOP.rx, Math.cos(angle) * LOON_LOOP.rz);
  const into = ((time % CYCLE) + CYCLE) % CYCLE;
  const tipStart = LOON_SURFACE_SEC;
  const riseStart = tipStart + LOON_TIP_SEC + LOON_UNDER_SEC;
  let under = 0;
  let pitch = 0;
  let ring = -1;
  if (into >= tipStart && into < tipStart + LOON_TIP_SEC) {
    const k = (into - tipStart) / LOON_TIP_SEC;
    under = k;
    pitch = -0.9 * k;
    ring = k * 0.5;
  } else if (into >= tipStart + LOON_TIP_SEC && into < riseStart) {
    under = 1;
    const since = into - tipStart - LOON_TIP_SEC;
    ring = since < LOON_TIP_SEC ? 0.5 + (since / LOON_TIP_SEC) * 0.5 : -1;
  } else if (into >= riseStart) {
    const k = (into - riseStart) / LOON_RISE_SEC;
    under = 1 - k;
    pitch = 0.5 * (1 - k);
    ring = k;
  }
  return { x, z, yaw, under, pitch, ring };
}

/** How far the head is raised for a call made `since` seconds ago: up fast, held, then down. */
export function loonCallLift(since: number) {
  if (since < 0 || since >= LOON_CALL_SEC) return 0;
  if (since < 0.3) return since / 0.3;
  if (since > LOON_CALL_SEC - 0.5) return (LOON_CALL_SEC - since) / 0.5;
  return 1;
}

/**
 * Where a sound at (x, z) sits for a listener at `ear` whose right hand points along `right` on the ground:
 * pan -1 left to 1 right, and a gain that falls with distance.
 */
export function soundPlace(ear: { x: number; z: number }, right: { x: number; z: number }, x: number, z: number) {
  const dx = x - ear.x;
  const dz = z - ear.z;
  const distance = Math.hypot(dx, dz);
  const across = Math.hypot(right.x, right.z);
  if (distance < 1e-6 || across < 1e-6) return { pan: 0, gain: 1 };
  const pan = Math.max(-1, Math.min(1, (dx * right.x + dz * right.z) / (distance * across)));
  return { pan, gain: 1 / (1 + distance / 18) };
}
