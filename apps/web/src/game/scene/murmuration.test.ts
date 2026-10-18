import { describe, expect, it } from "vitest";
import { FLOCK_SIZE, murmurationOut, starlingAt } from "./murmuration";

function box(time: number) {
  const birds = Array.from({ length: FLOCK_SIZE }, (_, i) => starlingAt(i, time));
  const span = (k: "x" | "y" | "z") => Math.max(...birds.map((b) => b[k])) - Math.min(...birds.map((b) => b[k]));
  return { birds, w: span("x"), h: span("y") };
}

describe("murmuration", () => {
  it("wheels at dusk in fall, unless rain or fog hides the sky", () => {
    expect(murmurationOut("dusk", "clear", "fall")).toBe(true);
    expect(murmurationOut("dusk", "overcast", "fall")).toBe(true);
    expect(murmurationOut("day", "clear", "fall")).toBe(false);
    expect(murmurationOut("dusk", "clear", "summer")).toBe(false);
    expect(murmurationOut("dusk", "rain", "fall")).toBe(false);
  });

  it("stays high over the far shore, beyond the hills", () => {
    for (let t = 0; t < 600; t += 7.3)
      for (const b of box(t).birds) {
        expect(b.y).toBeGreaterThan(7);
        expect(b.z).toBeLessThan(-38);
        expect(Math.abs(b.x)).toBeLessThan(32);
      }
  });

  it("moves each bird smoothly, as one cloud", () => {
    for (let i = 0; i < FLOCK_SIZE; i += 13)
      for (let t = 0; t < 120; t += 0.1) {
        const a = starlingAt(i, t);
        const b = starlingAt(i, t + 1 / 30);
        expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.4);
      }
  });

  it("changes shape as it wheels", () => {
    const ratios = Array.from({ length: 60 }, (_, k) => {
      const b = box(k * 4);
      return b.w / b.h;
    });
    expect(Math.max(...ratios) / Math.min(...ratios)).toBeGreaterThan(1.5);
  });
});
