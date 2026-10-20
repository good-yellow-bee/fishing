import { useSyncExternalStore } from "react";
import type { Settings } from "./settings";

/** Under this many frames a second, held for SLOW_WINDOWS windows in a row, the effects step down. */
export const SLOW_FPS = 40;
export const WINDOW_SEC = 3;
export const SLOW_WINDOWS = 2;
/** Loading, shader compiles and the first camera move stutter on every machine, so they never count. */
export const WARMUP_SEC = 5;
/** A frame this long means the tab was hidden or the page paused. Shorter ones, even 4 fps, are a slow machine. */
export const MAX_FRAME_SEC = 1;

/**
 * Feeds frame times and answers true once, when the frame rate has stayed
 * under SLOW_FPS for SLOW_WINDOWS whole windows after the warm-up.
 */
export function createFrameWatch() {
  let elapsed = 0;
  let windowTime = 0;
  let frames = 0;
  let slow = 0;
  let fired = false;
  return (delta: number): boolean => {
    if (fired) return false;
    if (delta > MAX_FRAME_SEC) {
      // A pause breaks the run: start the window over.
      windowTime = 0;
      frames = 0;
      return false;
    }
    elapsed += delta;
    if (elapsed < WARMUP_SEC) return false;
    windowTime += delta;
    frames += 1;
    if (windowTime < WINDOW_SEC) return false;
    slow = frames / windowTime < SLOW_FPS ? slow + 1 : 0;
    windowTime = 0;
    frames = 0;
    if (slow < SLOW_WINDOWS) return false;
    fired = true;
    return true;
  };
}

/** What a slow machine gives up: effects go Lite at once; shadows and the sharp picture go from the next visit, when the renderer is built again. */
export const STEP_DOWN: Partial<Settings> = { particles: "lite", shadows: false, sharpness: "fast", autoEffects: false };

/** When effects last stepped down on their own, for the Dock's one-line notice. */
let steppedDownAt = 0;
const listeners = new Set<() => void>();

export function noteEffectsSteppedDown(at = Date.now()) {
  steppedDownAt = at;
  listeners.forEach((listener) => listener());
}

export function useEffectsSteppedDown() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => steppedDownAt,
    () => 0,
  );
}
