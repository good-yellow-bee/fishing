import type { LakeSeason } from "@stillwater/shared";
import { readAngler, writeAngler } from "./anglerStore";

/** Kept per angler: the shiner trap by the shack, baited with a handful of groundbait, and when. */
export function trapKey(userId: string) {
  return `stillwater.trap.${userId}.v1`;
}
/** The trap needs this long in the water before shiners have found the groundbait in it. */
export const TRAP_SOAK_MS = 6 * 3_600_000;
/** Left longer than this, the shiners have nosed their way out again and the trap comes up empty. */
export const TRAP_STALE_MS = 72 * 3_600_000;
/** The most shiners a trap holds: few, since a day's free handful can bait it. */
export const TRAP_MAX = 2;
/** In winter's cold water the shiners move slowly: a trap baited then takes twice as long, and draws in only one. */
export const TRAP_COLD_SOAK_MS = 12 * 3_600_000;
export const TRAP_COLD_MAX = 1;

/** cold: baited in winter, so it soaks longer and holds fewer; fixed when it goes in. */
export type Trap = { setAt: number; cold?: true };

export function loadTrap(userId: string): Trap | null {
  return readAngler(trapKey(userId), (raw) => {
    const trap = raw as Partial<Trap> | null;
    return trap && typeof trap.setAt === "number" ? { setAt: trap.setAt, ...(trap.cold === true ? { cold: true } : {}) } : null;
  });
}

export function saveTrap(userId: string, trap: Trap | null) {
  writeAngler(trapKey(userId), trap);
}

/** Whether a trap baited in this season goes into cold water. */
export function trapIsCold(season: LakeSeason | undefined) {
  return season === "winter";
}

export function trapState(trap: Trap, now: number): "soaking" | "ready" | "stale" {
  const age = now - trap.setAt;
  return age < (trap.cold ? TRAP_COLD_SOAK_MS : TRAP_SOAK_MS) ? "soaking" : age > TRAP_STALE_MS ? "stale" : "ready";
}

/** The shiners a trap lifted in time holds: one to its most (TRAP_MAX, or TRAP_COLD_MAX in cold water); none once it has sat too long. */
export function trapCatch(trap: Trap, now: number, random: () => number): number {
  return trapState(trap, now) === "ready" ? 1 + Math.floor(random() * (trap.cold ? TRAP_COLD_MAX : TRAP_MAX)) : 0;
}
