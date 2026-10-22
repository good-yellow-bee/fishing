import { describe, expect, it } from "vitest";
import { brightCalm, HEAVY_BRIGHT_WAIT, LIGHT_WINTER_WAIT, LINE_SNAP, LINE_WAIT, lineWaitMul, murkyRain, nextLine, winterClear } from "./lineWeight";

describe("the line on the reel", () => {
  it("goes round from light to heavy and back", () => {
    expect(nextLine("light")).toBe("standard");
    expect(nextLine("standard")).toBe("heavy");
    expect(nextLine("heavy")).toBe("wire");
    expect(nextLine("wire")).toBe("light");
  });

  it("trades bites for strength: light bites sooner and snaps sooner, heavy the other way", () => {
    expect(LINE_WAIT.light).toBeLessThan(1);
    expect(LINE_SNAP.light).toBeLessThan(1);
    expect(LINE_WAIT.heavy).toBeGreaterThan(1);
    expect(LINE_SNAP.heavy).toBeGreaterThan(1);
    expect([LINE_WAIT.standard, LINE_SNAP.standard]).toEqual([1, 1]);
  });

  it("puts a wire leader on standard line: it holds as standard, but the fish see it", () => {
    expect(LINE_SNAP.wire).toBe(1);
    expect(LINE_WAIT.wire).toBeGreaterThan(LINE_WAIT.heavy);
  });

  it("finds the water bright and calm under a clear sky with no wind, from dawn to dusk", () => {
    for (const hour of ["dawn", "day", "dusk"] as const) expect(brightCalm(hour, "clear", "calm")).toBe(true);
  });

  it.each([
    ["at night", "night", "clear", "calm"],
    ["under a partly cloudy sky", "day", "partly-cloudy", "calm"],
    ["under cloud", "day", "overcast", "calm"],
    ["in the rain", "day", "rain", "calm"],
    ["in fog", "day", "fog", "calm"],
    ["in a light ripple", "day", "clear", "light-north"],
    ["in a breeze", "day", "clear", "breezy"],
    ["with no weather known", "day", undefined, undefined],
  ] as const)("doesn't find the water bright and calm %s", (_, hour, sky, wind) => {
    expect(brightCalm(hour, sky, wind)).toBe(false);
  });

  it("shows heavy line plainer in bright, calm water, and leaves the other lines as they are", () => {
    expect(lineWaitMul("heavy", true, false, false)).toBe(HEAVY_BRIGHT_WAIT);
    expect(HEAVY_BRIGHT_WAIT).toBeGreaterThan(LINE_WAIT.heavy);
    for (const line of ["light", "standard", "heavy", "wire"] as const) expect(lineWaitMul(line, false, false, false)).toBe(LINE_WAIT[line]);
    for (const line of ["light", "standard", "wire"] as const) expect(lineWaitMul(line, true, false, false)).toBe(LINE_WAIT[line]);
  });

  it("finds winter's water clear from dawn to dusk, and not at night or in the other seasons", () => {
    for (const hour of ["dawn", "day", "dusk"] as const) expect(winterClear(hour, "winter", "overcast")).toBe(true);
    expect(winterClear("night", "winter", "overcast")).toBe(false);
    for (const season of ["spring", "summer", "fall", undefined] as const) expect(winterClear("day", season, "overcast")).toBe(false);
  });

  it("makes the line-shy winter fish come sooner to light line and slower to heavy, without stacking on bright, calm water", () => {
    expect(lineWaitMul("light", false, true, false)).toBe(LIGHT_WINTER_WAIT);
    expect(LIGHT_WINTER_WAIT).toBeLessThan(LINE_WAIT.light);
    expect(lineWaitMul("heavy", false, true, false)).toBe(HEAVY_BRIGHT_WAIT);
    expect(lineWaitMul("heavy", true, true, false)).toBe(HEAVY_BRIGHT_WAIT);
    expect(lineWaitMul("light", true, true, false)).toBe(LIGHT_WINTER_WAIT);
    for (const line of ["standard", "wire"] as const) expect(lineWaitMul(line, true, true, false)).toBe(LINE_WAIT[line]);
  });

  it("finds the water murky in the rain, and not winter's clear water then", () => {
    expect(murkyRain("rain")).toBe(true);
    for (const sky of ["clear", "partly-cloudy", "overcast", "fog", undefined] as const) expect(murkyRain(sky)).toBe(false);
    expect(winterClear("day", "winter", "rain")).toBe(false);
    expect(winterClear("day", "winter", undefined)).toBe(true);
  });

  it("hides heavy line in murky rain water, so its bites come at the standard pace, winning over clear water, and leaves the other lines as they are", () => {
    expect(lineWaitMul("heavy", false, false, true)).toBe(LINE_WAIT.standard);
    expect(lineWaitMul("heavy", true, true, true)).toBe(LINE_WAIT.standard);
    for (const line of ["light", "standard", "wire"] as const) expect(lineWaitMul(line, false, false, true)).toBe(LINE_WAIT[line]);
  });
});
