import { describe, expect, it } from "vitest";
import { nearSunCount, sunMark } from "./sunLight";
import { sunTimes } from "./sunTimes";

describe("a fish's time against the sun", () => {
  const place = { lat: 46.83, lng: -94.17 };
  const sun = sunTimes("2026-10-12", place.lat, place.lng) as { rise: Date; set: Date };
  const shifted = (from: Date, minutes: number) => new Date(from.getTime() + minutes * 60000).toISOString();

  it("says how far from the nearer sunrise or sunset, within two hours", () => {
    expect(sunMark(shifted(sun.rise, 40), place)).toEqual({ edge: "rise", minutes: 40 });
    expect(sunMark(shifted(sun.set, -75), place)).toEqual({ edge: "set", minutes: -75 });
  });

  it("says daylight or dark away from both", () => {
    expect(sunMark(shifted(sun.rise, 240), place)).toEqual({ edge: null, light: "day" });
    expect(sunMark(shifted(sun.set, 200), place)).toEqual({ edge: null, light: "dark" });
    expect(sunMark("not a time", place)).toBeNull();
  });

  it("reads the water's own day whatever the device's time zone", () => {
    // Late evening at the water is already the next day in UTC; the sunset that counts is still this one.
    expect(sunMark(shifted(sun.set, 90), place)).toEqual({ edge: "set", minutes: 90 });
    expect(sunMark(shifted(sun.rise, -100), place)).toEqual({ edge: "rise", minutes: -100 });
  });

  it("counts the fish within an hour of either", () => {
    const fish = [shifted(sun.rise, 20), shifted(sun.set, -50), shifted(sun.set, -90), shifted(sun.rise, 300)].map((caughtAt) => ({ caughtAt }));
    expect(nearSunCount(fish, place)).toEqual({ near: 2, total: 4 });
  });
});
