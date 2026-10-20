import { describe, expect, it } from "vitest";
import { BASE_FOV, fovFor } from "./cameraFov";

const sideways = (fov: number, aspect: number) => 2 * Math.atan(Math.tan((fov / 2) * (Math.PI / 180)) * aspect);

describe("fovFor", () => {
  it("keeps the wide-screen framing on desktops, landscape phones and tablets", () => {
    for (const aspect of [1.6, 2.16, 1.33, 0.8]) expect(fovFor(aspect)).toBe(BASE_FOV);
  });

  it("opens up on a tall phone so the side-to-side view holds, up to a cap", () => {
    expect(sideways(fovFor(0.6), 0.6)).toBeCloseTo(sideways(BASE_FOV, 0.8));
    expect(fovFor(0.6)).toBeGreaterThan(BASE_FOV);
    expect(fovFor(0.46)).toBeLessThanOrEqual(70);
    expect(fovFor(0.5)).toBeGreaterThanOrEqual(fovFor(0.6));
  });

});
