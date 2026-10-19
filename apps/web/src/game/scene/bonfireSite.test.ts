import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { BONFIRE_AT, bonfireOut, bonfirePoint } from "./bonfireSite";
import { FIELDS, hayBales } from "./hayField";

describe("hill bonfire", () => {
  it("burns on dry fall evenings and nights", () => {
    expect(bonfireOut("dusk", "clear", "fall")).toBe(true);
    expect(bonfireOut("night", "overcast", "fall")).toBe(true);
    expect(bonfireOut("night", "rain", "fall")).toBe(false);
    expect(bonfireOut("day", "clear", "fall")).toBe(false);
    expect(bonfireOut("night", "clear", "summer")).toBe(false);
  });

  it("stands on the hills, in front of their face, outside both hay fields and clear of the bales", () => {
    const at = bonfirePoint();
    expect(hillFront(at.x, at.y)).not.toBeNull();
    expect(at.z).toBeGreaterThan(hillFront(at.x, at.y)!);
    FIELDS.forEach((field) => expect(Math.abs(at.x - field.x) > field.halfX || Math.abs(at.y - field.y) > field.halfY).toBe(true));
    hayBales().forEach((bale) => expect(Math.hypot(bale.x - BONFIRE_AT.x, bale.y - BONFIRE_AT.y)).toBeGreaterThan(0.8));
  });
});
