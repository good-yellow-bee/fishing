/** Battery saver draws at most this many frames a second. */
export const SAVER_FPS = 30;
/** A little under the frame's share of a second, so a 60 Hz screen's slightly early frames still count. */
const SLACK_MS = 2;

/** Whether a screen refresh at `now` should draw, given the last drawn one; times in ms. */
export function frameDue(now: number, last: number, fps = SAVER_FPS) {
  return now - last >= 1000 / fps - SLACK_MS;
}
