import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { BALE_RADIUS, FIELDS, FIELD_LIFT, balesOut, fieldPoint, hayBales } from "./hayField";

describe("hay fields", () => {
  it("lie mown from the summer's hay cut until the snow", () => {
    expect(balesOut("spring")).toBe(false);
    expect(balesOut("summer")).toBe(true);
    expect(balesOut("fall")).toBe(true);
    expect(balesOut("winter")).toBe(false);
  });

  it("lie on the hills' face, just in front of it", () => {
    FIELDS.forEach((_, f) => {
      for (const [u, v] of [[0, 0], [-1, -1], [1, 1], [0.5, -0.8]] as const) {
        const point = fieldPoint(f, u, v);
        expect(point).not.toBeNull();
        expect(point!.z).toBeCloseTo(hillFront(point!.x, point!.y)! + FIELD_LIFT);
      }
    });
  });

  it("round the fields' corners in", () => {
    const corner = fieldPoint(0, 1, 1)!;
    const field = FIELDS[0];
    expect(corner.x).toBeLessThan(field.x + field.halfX);
    expect(corner.y).toBeLessThan(field.y + field.halfY);
    expect(fieldPoint(0, 1, 0)!.x).toBeCloseTo(field.x + field.halfX);
  });

  it("dot every field with bales resting on the slope inside it", () => {
    const bales = hayBales();
    expect(bales.length).toBe(FIELDS.reduce((sum, field) => sum + field.rows.reduce((n, row) => n + row.count, 0), 0));
    for (const bale of bales) {
      const field = FIELDS.find((item) => Math.abs(bale.x - item.x) < item.halfX * 0.8 && Math.abs(bale.y - item.y) < item.halfY * 0.8);
      expect(field).toBeDefined();
      const face = hillFront(bale.x, bale.y)!;
      expect(bale.z).toBeGreaterThan(face);
      expect(bale.z).toBeLessThan(face + BALE_RADIUS);
    }
  });
});
