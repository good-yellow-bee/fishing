import { describe, expect, it } from "vitest";
import { SAVER_FPS, frameDue } from "./frameCap";

describe("frameDue", () => {
  it("draws every other refresh on a 60 Hz screen and every fourth at 120 Hz", () => {
    for (const hz of [60, 120]) {
      let last = -Infinity;
      let drawn = 0;
      for (let i = 0; i < hz; i += 1) {
        const now = (i * 1000) / hz;
        if (frameDue(now, last)) {
          drawn += 1;
          last = now;
        }
      }
      expect(drawn).toBe(SAVER_FPS);
    }
  });
});
