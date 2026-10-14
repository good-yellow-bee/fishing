import { describe, expect, it } from "vitest";
import { createFrameWatch, MAX_FRAME_SEC, SLOW_FPS, SLOW_WINDOWS, WARMUP_SEC, WINDOW_SEC } from "./frameWatch";

/** Feeds `seconds` of frames at `fps`; true if the watch fired along the way. */
function run(watch: (delta: number) => boolean, fps: number, seconds: number) {
  let fired = false;
  for (let t = 0; t < seconds; t += 1 / fps) fired = watch(1 / fps) || fired;
  return fired;
}

describe("frame watch", () => {
  it("never fires on a smooth machine", () => {
    const watch = createFrameWatch();
    expect(run(watch, 60, 120)).toBe(false);
    expect(run(watch, SLOW_FPS + 5, 60)).toBe(false);
  });

  it("ignores a slow warm-up while the lake loads", () => {
    const watch = createFrameWatch();
    expect(run(watch, 12, WARMUP_SEC - 0.2)).toBe(false);
    expect(run(watch, 60, 30)).toBe(false);
  });

  it("fires once after the frame rate stays low for whole windows", () => {
    const watch = createFrameWatch();
    run(watch, 60, WARMUP_SEC);
    expect(run(watch, 25, WINDOW_SEC * SLOW_WINDOWS - 0.5)).toBe(false);
    expect(run(watch, 25, 1)).toBe(true);
    expect(run(watch, 10, 60)).toBe(false);
  });

  it("still fires on a machine crawling at a few frames a second", () => {
    const watch = createFrameWatch();
    expect(run(watch, 4, WARMUP_SEC + WINDOW_SEC * SLOW_WINDOWS + 1)).toBe(true);
  });

  it("needs the slow windows in a row: a smooth window resets the count", () => {
    const watch = createFrameWatch();
    run(watch, 60, WARMUP_SEC);
    for (let i = 0; i < 5; i++) {
      expect(run(watch, 25, WINDOW_SEC * (SLOW_WINDOWS - 1) + 0.05)).toBe(false);
      expect(run(watch, 60, WINDOW_SEC + 0.05)).toBe(false);
    }
  });

  it("does not count a hidden tab's long pauses as slow frames", () => {
    const watch = createFrameWatch();
    run(watch, 60, WARMUP_SEC);
    for (let i = 0; i < 50; i++) {
      expect(watch(MAX_FRAME_SEC + 1)).toBe(false);
      expect(run(watch, 60, 1)).toBe(false);
    }
  });
});
