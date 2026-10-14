import { describe, expect, it } from "vitest";
import { CAP_BUILD_SEC, CAP_MELT_SEC, capSnow, snowing } from "./capSnow";

describe("snow on the angler's cap", () => {
  it("falls only as winter precipitation", () => {
    expect(snowing("rain", "winter")).toBe(true);
    expect(snowing("rain", "fall")).toBe(false);
    expect(snowing("clear", "winter")).toBe(false);
  });

  it("builds up while it snows and melts faster once it stops", () => {
    expect(capSnow(0, CAP_BUILD_SEC / 2, true)).toBeCloseTo(0.5);
    expect(capSnow(0.9, CAP_BUILD_SEC, true)).toBe(1);
    expect(capSnow(1, CAP_MELT_SEC / 2, false)).toBeCloseTo(0.5);
    expect(capSnow(0.1, CAP_MELT_SEC, false)).toBe(0);
  });
});
