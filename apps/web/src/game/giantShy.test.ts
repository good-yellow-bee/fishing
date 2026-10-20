import { describe, expect, it } from "vitest";
import { markShy, rollGiantShy, shyOf } from "./giantShy";

describe("a giant that broke free", () => {
  const tuesday = new Date(Date.UTC(2026, 9, 20, 9));

  it("will not take the lure it broke free of again at its bank, but takes another", () => {
    const shy = markShy(rollGiantShy(null, tuesday), "reeds", "Iron Jaw", "Mepps spinner");
    expect(shyOf(shy, "reeds", "Iron Jaw", "Mepps spinner")).toBe(true);
    expect(shyOf(shy, "reeds", "Iron Jaw", "Silver spoon")).toBe(false);
    expect(shyOf(shy, "dock", "Iron Jaw", "Mepps spinner")).toBe(false);
    expect(shyOf(shy, "reeds", "Old Moss", "Mepps spinner")).toBe(false);
    expect(markShy(shy, "reeds", "Iron Jaw", "Mepps spinner")).toBe(shy);
    expect(shyOf(markShy(shy, "reeds", "Iron Jaw", "Silver spoon"), "reeds", "Iron Jaw", "Mepps spinner")).toBe(true);
  });

  it("keeps the shyness all week, and forgets it when Monday brings new giants", () => {
    const shy = markShy(rollGiantShy(null, tuesday), "reeds", "Iron Jaw", "Mepps spinner");
    const stored = JSON.parse(JSON.stringify(shy));
    expect(shyOf(rollGiantShy(stored, new Date(Date.UTC(2026, 9, 25, 23))), "reeds", "Iron Jaw", "Mepps spinner")).toBe(true);
    expect(shyOf(rollGiantShy(stored, new Date(Date.UTC(2026, 9, 26, 1))), "reeds", "Iron Jaw", "Mepps spinner")).toBe(false);
    expect(rollGiantShy("junk", tuesday).lures).toEqual({});
  });
});
