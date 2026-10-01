import { retrieveHang, type FightSurge } from "./fightMotion";

/** Spool turns this many times for each turn of the handle. */
export const SPOOL_GEAR = 3;

const SAMPLE = 0.02;

/**
 * Meters of line coming in between two retrieve samples.
 * Follows the haul: hang shrinking counts, the drop back out does not.
 * A pause, a backward sample, or a run adds nothing.
 */
export function haulStep(prevPump: number, nextPump: number, reeling: boolean, surge: FightSurge) {
  if (!reeling || surge === 2 || !(nextPump > prevPump)) return 0;
  const steps = Math.max(1, Math.ceil((nextPump - prevPump) / SAMPLE));
  let taken = 0;
  let prevHang = retrieveHang(prevPump, true, surge);
  for (let i = 1; i <= steps; i += 1) {
    const pump = prevPump + ((nextPump - prevPump) * i) / steps;
    const hang = retrieveHang(pump, true, surge);
    if (hang < prevHang) taken += prevHang - hang;
    prevHang = hang;
  }
  return taken;
}

/** Handle angle for line already on the spool. One calm haul is one full turn. */
export function handleRadians(meters: number) {
  const calm = retrieveHang(0, true, 0);
  if (meters <= 0 || calm <= 0) return 0;
  return (meters / calm) * Math.PI * 2;
}

/** Spool angle geared to the same haul the handle is cranking. */
export function spoolRadians(meters: number) {
  return handleRadians(meters) * SPOOL_GEAR;
}
