import { describe, expect, it } from "vitest";
import { IDLE_MS, SAVER_FPS, frameDue, idleNow } from "./frameCap";

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

describe("idleNow", () => {
  it("drops after a quiet spell, never while a finger or button is held", () => {
    expect(idleNow(IDLE_MS - 1, 0, 0)).toBe(false);
    expect(idleNow(IDLE_MS, 0, 0)).toBe(true);
    expect(idleNow(IDLE_MS * 3, 0, 1)).toBe(false);
  });
});
