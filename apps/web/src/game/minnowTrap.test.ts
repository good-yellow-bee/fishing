import { describe, expect, it } from "vitest";
import { TRAP_COLD_MAX, TRAP_COLD_SOAK_MS, TRAP_MAX, TRAP_SOAK_MS, TRAP_STALE_MS, trapCatch, trapIsCold, trapState } from "./minnowTrap";

describe("the shiner trap", () => {
  const trap = { setAt: 0 };

  it("needs six hours in the water, and the shiners are out again after three days", () => {
    expect(trapState(trap, TRAP_SOAK_MS - 1)).toBe("soaking");
    expect(trapState(trap, TRAP_SOAK_MS)).toBe("ready");
    expect(trapState(trap, TRAP_STALE_MS + 1)).toBe("stale");
  });

  it("holds one or two shiners when lifted in time, and none when stale", () => {
    expect(trapCatch(trap, TRAP_SOAK_MS, () => 0)).toBe(1);
    expect(trapCatch(trap, TRAP_SOAK_MS, () => 0.99)).toBe(TRAP_MAX);
    expect(trapCatch(trap, TRAP_STALE_MS + 1, () => 0.99)).toBe(0);
  });

  it("goes into cold water when baited in winter: twelve hours to soak, and one shiner at most", () => {
    expect(trapIsCold("winter")).toBe(true);
    expect(trapIsCold("fall")).toBe(false);
    expect(trapIsCold(undefined)).toBe(false);
    const cold = { setAt: 0, cold: true } as const;
    expect(trapState(cold, TRAP_SOAK_MS)).toBe("soaking");
    expect(trapState(cold, TRAP_COLD_SOAK_MS)).toBe("ready");
    expect(trapState(cold, TRAP_STALE_MS + 1)).toBe("stale");
    expect(trapCatch(cold, TRAP_COLD_SOAK_MS, () => 0.99)).toBe(TRAP_COLD_MAX);
  });
});
