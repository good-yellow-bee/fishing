import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { BARN_OFFSET, FARM_AT, farmPoint } from "./farmstead";
import { FIELDS } from "./hayField";

describe("farmstead", () => {
  it("stands on the hills' face, out in front of it as high as its roof", () => {
    for (const [x, y] of [
      [FARM_AT.x, FARM_AT.y],
      [FARM_AT.x + BARN_OFFSET.x, FARM_AT.y + BARN_OFFSET.y],
    ] as const) {
      const at = farmPoint(x, y);
      expect(at.z).toBeGreaterThan(hillFront(x, y)!);
      expect(at.z).toBeGreaterThan(hillFront(x, y + 1.2)!);
      expect(at.z).toBeLessThan(hillFront(x, y)! + 1);
    }
  });

  it("keeps clear of the hay fields", () => {
    for (const field of FIELDS) expect(Math.abs(FARM_AT.x + BARN_OFFSET.x - field.x)).toBeGreaterThan(field.halfX + 0.5);
  });
});
