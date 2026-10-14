import { DOCK_STAND_Z, LAKE_CENTER_Z } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { FOX_CYCLE_SEC, FOX_FIRST_SEC, FOX_LOOK_SEC, FOX_OUT_SEC, FOX_TROT_SEC, FOX_VISIT_SEC, foxAt, foxOut } from "./foxTrot";

describe("fox", () => {
  it("is out at dusk and night, but not in rain", () => {
    expect(foxOut("dusk", "clear")).toBe(true);
    expect(foxOut("night", "fog")).toBe(true);
    expect(foxOut("night", "rain")).toBe(false);
    expect(foxOut("day", "clear")).toBe(false);
  });

  it("is hidden between visits and out on the far bank during one", () => {
    expect(foxAt(FOX_FIRST_SEC - 1).hidden).toBe(true);
    expect(foxAt(FOX_FIRST_SEC + FOX_VISIT_SEC + 1).hidden).toBe(true);
    for (let t = FOX_FIRST_SEC + 0.5; t < FOX_FIRST_SEC + FOX_VISIT_SEC; t += 1.3) {
      const fox = foxAt(t);
      expect(fox.hidden).toBe(false);
      expect(fox.z).toBeLessThan(LAKE_CENTER_Z - 8);
    }
  });

  it("trots, then stops and looks across the lake", () => {
    const trotting = foxAt(FOX_FIRST_SEC + FOX_OUT_SEC + 3);
    const later = foxAt(FOX_FIRST_SEC + FOX_OUT_SEC + 3.1);
    expect(trotting.gait).not.toBe(later.gait);
    expect(Math.hypot(later.x - trotting.x, later.z - trotting.z)).toBeGreaterThan(0.01);
    const looking = foxAt(FOX_FIRST_SEC + FOX_OUT_SEC + FOX_TROT_SEC + FOX_LOOK_SEC / 2);
    expect(looking.look).toBeCloseTo(1, 3);
    expect(looking.z).toBeLessThan(DOCK_STAND_Z);
  });

  it("runs the other way on the next visit", () => {
    const at = (visit: number, dt: number) => foxAt(FOX_FIRST_SEC + visit * FOX_CYCLE_SEC + FOX_OUT_SEC + dt);
    const first = at(0, 4).x - at(0, 2).x;
    const second = at(1, 4).x - at(1, 2).x;
    expect(Math.sign(first)).toBe(-Math.sign(second));
  });
});
