import { describe, expect, it } from "vitest";
import { TRAP_MAX, TRAP_SOAK_MS, TRAP_STALE_MS, trapCatch, trapState } from "./minnowTrap";

describe("the shiner trap", () => {
  const trap = { setAt: 0 };

  it("needs six hours in the water, and the shiners are out again after three days", () => {
    expect(trapState(trap, TRAP_SOAK_MS - 1)).toBe("soaking");
    expect(trapState(trap, TRAP_SOAK_MS)).toBe("ready");
    expect(trapState(trap, TRAP_STALE_MS + 1)).toBe("stale");
  });

  it("holds one to three shiners when lifted in time, and none when stale", () => {
    expect(trapCatch(trap, TRAP_SOAK_MS, () => 0)).toBe(1);
    expect(trapCatch(trap, TRAP_SOAK_MS, () => 0.99)).toBe(TRAP_MAX);
    expect(trapCatch(trap, TRAP_STALE_MS + 1, () => 0.99)).toBe(0);
  });
});
