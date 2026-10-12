import { LIFT_START_AGE } from "./catchLift";
import { LAND_PRESENT_SEC, LAND_SWING_SEC } from "./landMotion";

/**
 * Camera beats: how close the follow camera sits through a fight and a
 * landing. The camera only ever comes in from where the player left it,
 * never out past it, and goes back to that distance when the beat is over.
 */

/** Hooked: the camera leans in to the fight. */
export const FIGHT_DISTANCE = 6;
/** A hard pull: closer still, to feel the bend. */
export const TIGHT_DISTANCE = 5.3;
/** A run: ease back out so the line and the water it tears through are in frame. */
export const RUN_DISTANCE = 6.6;
/** The fish comes up into the hands: a close portrait. */
export const LAND_DISTANCE = 4.2;

/** The landing portrait lasts the swing, the present, and a beat to look at the fish. */
export const LAND_HOLD_SEC = LAND_SWING_SEC + LAND_PRESENT_SEC + 1;
const LAND_IN_SEC = 0.5;
const LAND_OUT_SEC = 0.6;

/** How quickly the distance follows its target, per second. */
export const DOLLY_RATE = 2.2;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smooth(u: number) {
  const t = clamp01(u);
  return t * t * (3 - 2 * t);
}

/** Camera distance for this moment of a fight. Tension leans in from 55% to 85%. */
export function fightDistance(surge: number, tension: number) {
  if (surge === 2) return RUN_DISTANCE;
  const tight = smooth((tension - 0.55) / 0.3);
  return FIGHT_DISTANCE + (TIGHT_DISTANCE - FIGHT_DISTANCE) * tight;
}

/** 0..1, how far into the landing portrait the camera is at this landing age. */
export function landingWeight(age: number) {
  const since = age - LIFT_START_AGE;
  if (since < 0) return 0;
  if (since < LAND_IN_SEC) return smooth(since / LAND_IN_SEC);
  if (age < LAND_HOLD_SEC) return 1;
  return 1 - smooth((age - LAND_HOLD_SEC) / LAND_OUT_SEC);
}

/** The landing is still being framed. False once the camera has handed back. */
export function landingFramed(age: number) {
  return landingWeight(age) > 0;
}

/** Distance through the landing, from the player's own distance into the portrait and back. */
export function landingDistance(userDistance: number, age: number) {
  const w = landingWeight(age);
  return userDistance + (beatDistance(userDistance, LAND_DISTANCE) - userDistance) * w;
}

/** A beat only ever brings the camera in. A player already closer stays put. */
export function beatDistance(userDistance: number, beat: number) {
  return Math.min(userDistance, beat);
}

/** One frame of easing toward the target distance. */
export function dollyStep(current: number, target: number, delta: number) {
  return current + (target - current) * (1 - Math.exp(-DOLLY_RATE * delta));
}
