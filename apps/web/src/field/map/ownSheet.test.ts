import { describe, expect, it } from "vitest";
import { OWN_HEIGHT, OWN_WIDTH, fitFrame, gridLines, projectIn } from "./ownSheet";

describe("a sheet fitted to the angler's own pins", () => {
  it("keeps every pin inside, with the ground's shape", () => {
    const pins = [
      { lat: 27.9, lng: -82.5 },
      { lat: 27.95, lng: -82.45 },
    ];
    const frame = fitFrame(pins);
    for (const pin of pins) {
      const { x, y } = projectIn(frame, pin);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(OWN_WIDTH);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(OWN_HEIGHT);
    }
    const squeeze = Math.cos((27.925 * Math.PI) / 180);
    expect(((frame.east - frame.west) * squeeze) / (frame.north - frame.south)).toBeCloseTo(OWN_WIDTH / OWN_HEIGHT, 5);
  });

  it("gives one pin a small frame around it", () => {
    const frame = fitFrame([{ lat: 52.2, lng: 21 }]);
    expect(frame.north - frame.south).toBeGreaterThan(0.005);
    expect(projectIn(frame, { lat: 52.2, lng: 21 }).x).toBeCloseTo(OWN_WIDTH / 2, 5);
  });

  it("draws a few round lines", () => {
    expect(gridLines(27.88, 27.97)).toEqual({ values: [27.9, 27.92, 27.94, 27.96], digits: 2 });
    expect(gridLines(52.197, 52.203).digits).toBe(3);
    expect(gridLines(10, 60)).toEqual({ values: [20, 30, 40, 50], digits: 0 });
  });
});
