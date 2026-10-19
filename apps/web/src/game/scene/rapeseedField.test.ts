import { describe, expect, it } from "vitest";
import { balesOut } from "./hayField";
import { MILL_AT } from "./millSails";
import { rapeseedOut, rapeseedSpan } from "./rapeseedField";
import { EWES } from "./sheepFlock";

describe("rapeseed field", () => {
  it("flowers in spring only, never under the summer's bales", () => {
    expect(rapeseedOut("spring")).toBe(true);
    (["summer", "fall", "winter"] as const).forEach((season) => expect(rapeseedOut(season)).toBe(false));
    (["spring", "summer", "fall", "winter"] as const).forEach((season) => expect(rapeseedOut(season) && balesOut(season)).toBe(false));
  });

  it("lies under the windmill, clear of the grazing sheep", () => {
    const span = rapeseedSpan();
    expect(MILL_AT.x).toBeGreaterThan(span.left);
    expect(MILL_AT.x).toBeLessThan(span.right);
    expect(MILL_AT.y).toBeGreaterThan(span.top);
    EWES.forEach((ewe) => expect(ewe.x).toBeLessThan(span.left - 0.5));
  });
});
