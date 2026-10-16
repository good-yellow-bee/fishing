import { describe, expect, it } from "vitest";
import { sunTimes } from "./sunTimes";

const utc = (date: Date) => date.toISOString().slice(11, 16);

describe("sunTimes", () => {
  it("gives sunrise and sunset within a few minutes of the almanac", () => {
    const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
    const near = (date: Date, hhmm: string) => expect(Math.abs(minutes(utc(date)) - minutes(hhmm))).toBeLessThanOrEqual(3);
    // New York on the June solstice: sunrise 5:25 and sunset 8:31 in the evening, EDT (09:25 and 00:31 UTC).
    const york = sunTimes("2026-06-21", 40.71, -74.0);
    if (!("rise" in york)) throw new Error("no sunrise");
    near(york.rise, "09:25");
    near(york.set, "00:31");
    // Warsaw on the same day: 4:14 and 9:01 in the evening, CEST.
    const warsaw = sunTimes("2026-06-21", 52.23, 21.01);
    if (!("rise" in warsaw)) throw new Error("no sunrise");
    near(warsaw.rise, "02:14");
    near(warsaw.set, "19:01");
  });

  it("says when the sun neither rises nor sets", () => {
    expect(sunTimes("2026-06-21", 78, 15)).toEqual({ always: "up" });
    expect(sunTimes("2026-12-21", 78, 15)).toEqual({ always: "down" });
  });
});
