import { reelPumpLift, retrieveHang, type FightSurge } from "./fightMotion";

/** Spool turns this many times for each turn of the handle. */
export const SPOOL_GEAR = 3;

const SAMPLE = 0.02;

/** Finished hauls plus the inbound part of the current one. The drop does not unwind it. */
function inbound(pump: number) {
  if (pump <= 0) return 0;
  const base = Math.floor(pump);
  const u = pump - base;
  const steps = Math.max(1, Math.ceil(u / SAMPLE));
  let peak = 0;
  for (let i = 0; i <= steps; i += 1) {
    peak = Math.max(peak, reelPumpLift(base + (u * i) / steps));
  }
  return base + peak;
}

/**
 * Meters of line coming in between two retrieve samples.
 * Scales with the haul for this surge. The drop, a pause, and a run add nothing.
 */
export function haulStep(prevPump: number, nextPump: number, reeling: boolean, surge: FightSurge) {
  if (!reeling || surge === 2 || !(nextPump > prevPump)) return 0;
  const gained = inbound(nextPump) - inbound(prevPump);
  if (gained <= 0) return 0;
  return gained * retrieveHang(0, true, surge);
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
