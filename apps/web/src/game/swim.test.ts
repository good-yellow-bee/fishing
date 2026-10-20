import { describe, expect, it } from "vitest";
import { GROUNDBAIT_CASTS } from "./logic";
import { SWIM_COLD_GONE_MS, SWIM_COLD_PRIMED_MS, SWIM_GONE_MS, SWIM_HOT_GONE_MS, SWIM_HOT_PRIMED_MS, SWIM_PRIMED_MS, swimNow, swimTimes } from "./swim";

const swim = { spot: "reeds" as const, casts: 2, at: 0 };

describe("a groundbaited swim left for the next visit", () => {
  it("keeps its casts soon after, fishes as freshly baited once left overnight, and is gone after two days", () => {
    expect(swimNow(swim, SWIM_PRIMED_MS - 1)).toEqual({ ...swim, primedNow: false });
    expect(swimNow(swim, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, at: 0, primed: true, primedNow: true });
    // Primed once, it is not refilled again, and is gone two days after the handful went in.
    expect(swimNow({ ...swim, primed: true }, SWIM_PRIMED_MS * 2)).toEqual({ ...swim, primed: true, primedNow: false });
    expect(swimNow(swim, SWIM_GONE_MS + 1)).toBeNull();
    expect(swimNow({ ...swim, casts: 0 }, 1)).toBeNull();
    expect(swimNow(null, 1)).toBeNull();
  });

  it("follows the season the angler comes back in: summer's fish find it sooner and eat it in a day, winter's are slow but it keeps four days", () => {
    expect(swimTimes("spring")).toEqual({ primedMs: SWIM_PRIMED_MS, goneMs: SWIM_GONE_MS });
    expect(swimTimes("fall")).toEqual(swimTimes(undefined));
    expect(swimNow(swim, SWIM_HOT_PRIMED_MS, "summer")?.primedNow).toBe(true);
    expect(swimNow(swim, SWIM_HOT_PRIMED_MS, "spring")?.primedNow).toBe(false);
    expect(swimNow(swim, SWIM_HOT_GONE_MS + 1, "summer")).toBeNull();
    expect(swimNow(swim, SWIM_PRIMED_MS, "winter")?.primedNow).toBe(false);
    expect(swimNow(swim, SWIM_COLD_PRIMED_MS, "winter")?.primedNow).toBe(true);
    expect(swimNow({ ...swim, primed: true }, SWIM_GONE_MS + 1, "winter")).toEqual({ ...swim, primed: true, primedNow: false });
    expect(swimNow(swim, SWIM_COLD_GONE_MS + 1, "winter")).toBeNull();
  });
});
