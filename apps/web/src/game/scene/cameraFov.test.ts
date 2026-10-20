import { describe, expect, it } from "vitest";
import { BASE_FOV, FIGHT_LIFT, MAX_FOV, fightLiftFor, fovFor } from "./cameraFov";

const sideways = (fov: number, aspect: number) => (2 * Math.atan(Math.tan((fov / 2) * (Math.PI / 180)) * aspect)) / (Math.PI / 180);

describe("fovFor", () => {
  it("keeps the wide-screen framing on desktops, landscape phones and tablets, and before the canvas is measured", () => {
    for (const aspect of [1.6, 2.16, 1.33, 0.8, Number.NaN, 0]) expect(fovFor(aspect)).toBe(BASE_FOV);
    expect(fovFor(0.799)).toBeCloseTo(BASE_FOV, 0);
  });

  it("opens up on a narrow screen so the side-to-side view holds, up to a cap that portrait phones reach", () => {
    expect(sideways(fovFor(0.6), 0.6)).toBeCloseTo(sideways(BASE_FOV, 0.8));
    expect(fovFor(0.6)).toBeGreaterThan(BASE_FOV);
    // 390x844: capped, still about 36° across instead of 23°.
    expect(fovFor(390 / 844)).toBe(MAX_FOV);
    expect(sideways(fovFor(390 / 844), 390 / 844)).toBeGreaterThan(35);
    expect(sideways(BASE_FOV, 390 / 844)).toBeLessThan(24);
  });

  it("keeps every screen's view as framed while a fish is on, the fight card being above the fight", () => {
    expect(FIGHT_LIFT).toBe(0);
    expect(fightLiftFor(390 / 844)).toBe(0);
    expect(fightLiftFor(360 / 640)).toBe(0);
    // A tablet held upright (768x1024) keeps its view.
    for (const aspect of [768 / 1024, 0.8, 1.6, 2.16, 0, Number.NaN]) expect(fightLiftFor(aspect)).toBe(0);
  });
});
