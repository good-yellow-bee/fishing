/** Which visit `time` falls in for a creature that first comes `firstSec` in and then every `everySec`: its index from 0 (negative before the first) and how far into it. */
export function visitAt(time: number, firstSec: number, everySec: number) {
  const t = time - firstSec;
  const index = Math.floor(t / everySec);
  return { index, into: t - index * everySec };
}

/** Turns from `from` to `to` (radians) the short way round by `k`, 0 to 1. */
export function turnBetween(from: number, to: number, k: number) {
  const gap = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + gap * Math.min(1, Math.max(0, k));
}

/** How long a startled bird takes to swing round toward where it flies, seconds. */
export const STARTLE_TURN_SEC = 0.25;
