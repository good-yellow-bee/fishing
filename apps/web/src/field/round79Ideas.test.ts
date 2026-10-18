import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fitFrame, scaleBar } from "./map/ownSheet";
import { kmBetween } from "./spotOrder";

describe("round 79 ideas: the own sheet's scale bar", () => {
  it("picks a round distance near a fifth of the sheet, drawn to length", () => {
    const frame = fitFrame([{ lat: 53.8, lng: 21.6 }, { lat: 53.7, lng: 21.45 }, { lat: 53.75, lng: 21.8 }]);
    const mid = (frame.north + frame.south) / 2;
    const across = kmBetween({ lat: mid, lng: frame.west }, { lat: mid, lng: frame.east });
    const metric = scaleBar(frame, true);
    expect([1, 2, 5, 10]).toContain(metric.km);
    expect(metric.length).toBeCloseTo((metric.km / across) * 1000, 6);
    expect(metric.length).toBeGreaterThan(100);
    expect(metric.length).toBeLessThan(400);
    const miles = scaleBar(frame, false);
    expect([1, 2, 5, 10]).toContain(Math.round((miles.km / 1.609344) * 1000) / 1000);
  });

  it("gives two swims a walk apart a bar of a few hundred metres", () => {
    const tight = scaleBar(fitFrame([{ lat: 53.8, lng: 21.6 }, { lat: 53.8005, lng: 21.6005 }]), true);
    expect(tight.km).toBeCloseTo(0.2, 6);
  });
});

describe("round 79 ideas: a sample water's page leads to its place on the Map", () => {
  const page = readFileSync(`${import.meta.dirname}/SpotPages.tsx`, "utf8");

  it("links placeFor waters to their map row", () => {
    expect(page).toMatch(/placeFor\(spot\.id\) \? \([\s\S]{0,200}\/map#water-\$\{spot\.id\}/);
  });
});
