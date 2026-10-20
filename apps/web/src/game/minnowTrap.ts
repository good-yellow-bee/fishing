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

export type Trap = { setAt: number };

export function loadTrap(userId: string): Trap | null {
  return readAngler(trapKey(userId), (raw) => {
    const trap = raw as Partial<Trap> | null;
    return trap && typeof trap.setAt === "number" ? { setAt: trap.setAt } : null;
  });
}

export function saveTrap(userId: string, trap: Trap | null) {
  writeAngler(trapKey(userId), trap);
}

export function trapState(trap: Trap, now: number): "soaking" | "ready" | "stale" {
  const age = now - trap.setAt;
  return age < TRAP_SOAK_MS ? "soaking" : age > TRAP_STALE_MS ? "stale" : "ready";
}

/** The shiners a trap lifted in time holds: one to TRAP_MAX; none once it has sat too long. */
export function trapCatch(trap: Trap, now: number, random: () => number): number {
  return trapState(trap, now) === "ready" ? 1 + Math.floor(random() * TRAP_MAX) : 0;
}
