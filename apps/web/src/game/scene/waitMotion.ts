import { keepLureInWater } from "./fightMotion";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

/** Waiting-rod pitch. The twitch leaves and returns here. */
export const WAIT_ROD = 1.05;

/** Resting belly of a line whose lure is sitting. */
export const WAIT_REST_SAG = 0.22;

/** Splash hop is 0.36s. The twitch starts once that pop has sat down. */
export const WAIT_TWITCH_AT = 0.48;

/** Tip dips and the line bellies. */
export const WAIT_EASE_SEC = 0.32;

/** Tip lifts, the belly comes out, and the bobber is drawn in. */
export const WAIT_TIGHT_SEC = 0.28;

/** Back to the rest pose. One twitch, then it stays there. */
export const WAIT_SETTLE_SEC = 0.22;

const SAMPLE = 0.5;
const DRIFT_GAIN = 2.8;
const DRIFT_MAX = 0.26;
const NOD_GAIN = 3.4;
const NOD_MAX = 0.26;
const EASE_PITCH = 0.16;
const TIGHT_PITCH = -0.2;
const EASE_SAG = 0.58;
const TIGHT_SAG = 0.045;
const PULL = 0.14;
const EASE_LEAN = 0.08;
const TIGHT_LEAN = -0.06;

export const waitView = {
  /** Seconds since the lure sat on the water. Negative in the air and off the wait. */
  age: -1,
};

export function waitTwitchEnd() {
  return WAIT_TWITCH_AT + WAIT_EASE_SEC + WAIT_TIGHT_SEC + WAIT_SETTLE_SEC;
}

/** The lure is out and sitting. False in the air and in every other phase. */
export function lureIsWaiting(phase: ScenePhase, flying: boolean) {
  return phase === "waiting" && !flying;
}

export function waitTwitchActive(age: number) {
  return age >= WAIT_TWITCH_AT && age < waitTwitchEnd();
}

function clamp(value: number, lo: number, hi: number) {
  const next = Math.min(hi, Math.max(lo, value));
  return Math.abs(next) < 1e-8 ? 0 : next;
}

function smooth(u: number) {
  const t = clamp(u, 0, 1);
  return t * t * (3 - 2 * t);
}

/** 0 before the twitch, 1 at the end of ease, 2 at the end of the tighten, 3 once settled. */
function twitchStep(age: number) {
  if (age < WAIT_TWITCH_AT) return { step: 0, u: 0 };
  const ageIn = age - WAIT_TWITCH_AT;
  if (ageIn <= WAIT_EASE_SEC) return { step: 1, u: smooth(ageIn / WAIT_EASE_SEC) };
  if (ageIn < WAIT_EASE_SEC + WAIT_TIGHT_SEC) {
    return { step: 2, u: smooth((ageIn - WAIT_EASE_SEC) / WAIT_TIGHT_SEC) };
  }
  const settled = ageIn - WAIT_EASE_SEC - WAIT_TIGHT_SEC;
  if (settled < WAIT_SETTLE_SEC) return { step: 3, u: smooth(settled / WAIT_SETTLE_SEC) };
  return { step: 0, u: 0 };
}

function blend(step: number, u: number, rest: number, eased: number, tight: number) {
  if (step === 1) return rest + (eased - rest) * u;
  if (step === 2) return eased + (tight - eased) * u;
  if (step === 3) return tight + (rest - tight) * u;
  return rest;
}

/** Rod pitch. One dip that eases the line, one lift that tightens it. */
export function waitRodPitch(age: number) {
  const { step, u } = twitchStep(age);
  return blend(step, u, WAIT_ROD, WAIT_ROD + EASE_PITCH, WAIT_ROD + TIGHT_PITCH);
}

/** Belly of the line, meters. Slack on the dip, then pulled straight. */
export function waitLineSag(age: number) {
  const { step, u } = twitchStep(age);
  return blend(step, u, WAIT_REST_SAG, EASE_SAG, TIGHT_SAG);
}

/** Meters the sitting bobber is drawn toward the angler. Only while the line tightens. */
export function waitTwitchPull(age: number) {
  const { step, u } = twitchStep(age);
  if (step === 2) return PULL * u;
  if (step === 3) return PULL * (1 - u);
  return 0;
}

/** Forward lean of the angler through the same twitch. */
export function waitBodyLean(age: number) {
  const { step, u } = twitchStep(age);
  return blend(step, u, 0, EASE_LEAN, TIGHT_LEAN);
}

/** Horizontal slide, meters, down the face of the chop. */
export function waitDrift(x: number, z: number, time: number) {
  const y = waterHeight(x, z, time);
  const slopeX = (waterHeight(x + SAMPLE, z, time) - y) / SAMPLE;
  const slopeZ = (waterHeight(x, z + SAMPLE, time) - y) / SAMPLE;
  return {
    x: clamp(-slopeX * DRIFT_GAIN, -DRIFT_MAX, DRIFT_MAX),
    z: clamp(-slopeZ * DRIFT_GAIN, -DRIFT_MAX, DRIFT_MAX),
  };
}

/** Bobber pitch and roll, radians, laid on the local slope. */
export function waitNod(x: number, z: number, time: number) {
  const y = waterHeight(x, z, time);
  return {
    x: clamp((waterHeight(x, z + SAMPLE, time) - y) * NOD_GAIN, -NOD_MAX, NOD_MAX),
    z: clamp((y - waterHeight(x + SAMPLE, z, time)) * NOD_GAIN, -NOD_MAX, NOD_MAX),
  };
}

/** Drift plus the tighten pull. The pull is toward the angler. */
export function applyWaitShift(
  x: number,
  z: number,
  anglerX: number,
  anglerZ: number,
  time: number,
  age: number,
) {
  const drift = waitDrift(x, z, time);
  let nextX = x + drift.x;
  let nextZ = z + drift.z;
  const pull = waitTwitchPull(age);
  if (pull > 0) {
    const dx = anglerX - nextX;
    const dz = anglerZ - nextZ;
    const reach = Math.hypot(dx, dz) || 1;
    nextX += (dx / reach) * pull;
    nextZ += (dz / reach) * pull;
  }
  return keepLureInWater(x, z, nextX, nextZ);
}
