import { describe, expect, it } from "vitest";
import { GROUNDBAIT_CASTS } from "./logic";
import { SWIM_GONE_MS, SWIM_PRIMED_MS, swimNow } from "./swim";

const swim = { spot: "reeds" as const, casts: 2, at: 0 };

describe("a groundbaited swim left for the next visit", () => {
  it("keeps its casts soon after, fishes as freshly baited once left overnight, and is gone after two days", () => {
    expect(swimNow(swim, SWIM_PRIMED_MS - 1)).toEqual({ spot: "reeds", casts: 2, primed: false });
    expect(swimNow(swim, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, primed: true });
    expect(swimNow(swim, SWIM_GONE_MS + 1)).toBeNull();
    expect(swimNow({ ...swim, casts: 0 }, 1)).toBeNull();
    expect(swimNow(null, 1)).toBeNull();
  });
});
