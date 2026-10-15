/** Battery saver draws at most this many frames a second. */
export const SAVER_FPS = 30;
/** A little under the frame's share of a second, so a 60 Hz screen's slightly early frames still count. */
const SLACK_MS = 2;

/** Whether a screen refresh at `now` should draw, given the last drawn one; times in ms. */
export function frameDue(now: number, last: number, fps = SAVER_FPS) {
  return now - last >= 1000 / fps - SLACK_MS;
}

/** With no touch, click, key or pad press for this long, the lake draws at the saver rate until the next one. */
export const IDLE_MS = 90_000;

/** Whether the lake should drop to the saver rate: no pointer held and nothing pressed for IDLE_MS. */
export function idleNow(now: number, lastInput: number, pointersDown: number) {
  return pointersDown === 0 && now - lastInput >= IDLE_MS;
}

/** Shared with the frame watch: an idle drop to 30 a second is chosen, not a sign of a slow machine. */
export const frameThrottle = { idle: false };
