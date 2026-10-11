import { describe, expect, it } from "vitest";
import { RED_TENSION } from "./fight";
import { dragTone, RASP_TENSION } from "./dragTone";

describe("dragTone", () => {
  it("is silent on a slack line and climbs in pitch and volume with tension", () => {
    expect(dragTone(0.1, 0, true).gain).toBe(0);
    let prev = dragTone(0.21, 0, true);
    for (let t = 0.25; t <= 1.2; t += 0.05) {
      const next = dragTone(t, 0, true);
      expect(next.gain).toBeGreaterThanOrEqual(prev.gain);
      expect(next.hz).toBeGreaterThanOrEqual(prev.hz);
      prev = next;
    }
    expect(dragTone(1.5, 0, true)).toEqual(dragTone(1, 0, true));
  });

  it("rasps before the tension reaches the red that spoils a clean fight", () => {
    expect(RASP_TENSION).toBeLessThan(RED_TENSION);
    expect(dragTone(RASP_TENSION - 0.01, 0, true).rasp).toBe(false);
    expect(dragTone(RASP_TENSION, 0, true).rasp).toBe(true);
  });

  it("hisses only while a run takes line the angler is not reeling against", () => {
    expect(dragTone(0.5, 2, false).hiss).toBe(true);
    expect(dragTone(0.5, 2, true).hiss).toBe(false);
    expect(dragTone(0.5, 1, false).hiss).toBe(false);
  });
});
