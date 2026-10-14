/**
 * A picture of the lake from photo mode. The dock asks for one; the scene's
 * next frame renders and copies the canvas at its full size, since the pixels
 * are gone once the frame is shown (no preserveDrawingBuffer).
 */

/** How long to wait for a frame before giving up (a hidden tab draws none). */
export const LAKE_SHOT_WAIT_MS = 2000;

type Waiting = (canvas: HTMLCanvasElement | null) => void;

let waiting: Waiting | null = null;

/** Resolves with a copy of the next frame, or null when no frame comes or the copy fails. */
export function requestLakeShot(): Promise<HTMLCanvasElement | null> {
  waiting?.(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (waiting === done) waiting = null;
      resolve(null);
    }, LAKE_SHOT_WAIT_MS);
    const done: Waiting = (canvas) => {
      clearTimeout(timer);
      resolve(canvas);
    };
    waiting = done;
  });
}

/** Whether the dock is waiting on a picture. */
export function lakeShotWanted() {
  return waiting !== null;
}

/** Copies the canvas as it is right now and hands it to whoever asked. Call it in the same task as the render. */
export function takeLakeShot(source: HTMLCanvasElement) {
  const done = waiting;
  if (!done) return;
  waiting = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");
    if (!context) return done(null);
    context.drawImage(source, 0, 0);
    done(canvas);
  } catch {
    // A tainted or lost context leaves no picture.
    done(null);
  }
}

/** File name for a saved lake picture: day and minute, safe on any system. */
export function lakePictureFileName(when: Date) {
  const two = (value: number) => String(value).padStart(2, "0");
  return `stillwater-lake-${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())}-${two(when.getHours())}${two(when.getMinutes())}.png`;
}
