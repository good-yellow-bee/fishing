import { describe, expect, it } from "vitest";
import { HEAVY_BRIGHT_WAIT, LINE_SNAP, LINE_WAIT, lineWaitMul, nextLine } from "./lineWeight";

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

  it("shows heavy line plainer in bright, calm water from dawn to dusk", () => {
    expect(HEAVY_BRIGHT_WAIT).toBeGreaterThan(LINE_WAIT.heavy);
    for (const hour of ["dawn", "day", "dusk"] as const) expect(lineWaitMul("heavy", hour, "clear", "calm")).toBe(HEAVY_BRIGHT_WAIT);
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
  ] as const)("keeps heavy line's usual wait %s", (_, hour, sky, wind) => {
    expect(lineWaitMul("heavy", hour, sky, wind)).toBe(LINE_WAIT.heavy);
  });

  it("leaves the other lines as they are in bright, calm water", () => {
    for (const line of ["light", "standard", "wire"] as const) expect(lineWaitMul(line, "day", "clear", "calm")).toBe(LINE_WAIT[line]);
  });
});
