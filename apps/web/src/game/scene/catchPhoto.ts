import { catchPhotoRejection } from "@stillwater/shared";

/**
 * The photo the scene snaps as a landed fish is held up. The scene doesn't
 * know the catch's id, so the dock pins the latest shot to the catch on show.
 */

/** Longest edge of the snapshot, px. Small enough to sit well under the photo cap. */
export const PHOTO_EDGE = 640;
const QUALITIES = [0.6, 0.45, 0.3];

type Shot = { seq: number; dataUrl: string };

let latest: Shot | null = null;
let seq = 0;
const listeners = new Set<() => void>();

export function subscribeCatchShot(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function latestCatchShot() {
  return latest;
}

export function postCatchShot(dataUrl: string) {
  seq += 1;
  latest = { seq, dataUrl };
  for (const listener of listeners) listener();
}

export function clearCatchShot() {
  latest = null;
}

/** Size of the snapshot for a canvas, longest edge capped at PHOTO_EDGE. */
export function photoSize(width: number, height: number) {
  const scale = Math.min(1, PHOTO_EDGE / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Downscale what the canvas holds right now into a JPEG data URL. Call it in
 * the same task as the render: without preserveDrawingBuffer the pixels are
 * gone once the frame is shown. Null when nothing fits under the photo cap.
 */
export function snapCanvas(source: HTMLCanvasElement): string | null {
  const size = photoSize(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(source, 0, 0, size.width, size.height);
  for (const quality of QUALITIES) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (!catchPhotoRejection(dataUrl)) return dataUrl;
  }
  return null;
}
