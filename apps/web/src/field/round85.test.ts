import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { searchSummary } from "./summaries";
import { OWN_WIDTH, fitFrame, projectIn, scaleSpot } from "./map/ownSheet";

const fish = (id: string, caughtAt: string, inches: number): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches },
  lure: "Jig",
  spotId: "own-lake",
  tripId: null,
  caughtAt,
  note: "",
  weather: null,
});

describe("round 85: a search shown largest first copies in that order", () => {
  const shown = [fish("big", "2026-03-01T10:00:00.000Z", 24), fish("small", "2026-01-01T10:00:00.000Z", 12)];

  it("keeps the order shown and says so", () => {
    const lines = searchSummary(["zander"], shown, () => null, true).split("\n");
    expect(lines[1]).toBe("2 fish · Largest first");
    expect(lines[2]).toMatch(/24 in/);
  });

  it("lists by date otherwise", () => {
    const lines = searchSummary(["zander"], shown, () => null).split("\n");
    expect(lines[1]).toBe("2 fish");
    expect(lines[2]).toMatch(/12 in/);
  });
});

describe("round 85: the own sheet's scale bar keeps clear of the pins", () => {
  it("leaves the top right to a pin there, for a corner none is in", () => {
    const pair = [projectIn(fitFrame([{ lat: 54.0, lng: 18.0 }, { lat: 53.99, lng: 18.02 }]), { lat: 54.0, lng: 18.02 })];
    const frame = fitFrame([{ lat: 50.06, lng: 19.94 }, { lat: 54.35, lng: 18.65 }]);
    const points = [projectIn(frame, { lat: 50.06, lng: 19.94 }), projectIn(frame, { lat: 54.35, lng: 18.65 })];
    for (const set of [pair, points]) {
      const { box } = scaleSpot(set, 200);
      for (const point of set) expect(point.x >= box.x0 && point.x <= box.x1 && point.y >= box.y0 && point.y <= box.y1).toBe(false);
    }
  });

  it("stays top right when nothing is there", () => {
    expect(scaleSpot([{ x: 200, y: 400 }], 200)).toMatchObject({ x: OWN_WIDTH - 240, y: 40 });
  });
});
