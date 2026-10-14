/**
 * Turning and zooming the view in photo mode. The panels' overlay covers the canvas there, so the
 * dock gathers drags, pinches, the wheel and arrow keys here and the camera rig spends them each frame.
 */

/** Radians the view turns per pixel dragged. */
export const PHOTO_TURN = 0.006;
/** The same limits as the free camera, so photo mode never sees under the lake or past the hills. */
export const PHOTO_LIMITS = { minPolar: 0.48, maxPolar: 1.38, minDistance: 3.4, maxDistance: 15 };

export type Look = { yaw: number; pitch: number; zoom: number };

const pending: Look = { yaw: 0, pitch: 0, zoom: 1 };

/** A drag of dx, dy pixels: right turns the view around to the left, as OrbitControls does, down tips it to look down. */
export function lookDrag(dx: number, dy: number) {
  pending.yaw -= dx * PHOTO_TURN;
  pending.pitch -= dy * PHOTO_TURN;
}

/** Above 1 moves the camera out, below 1 in. */
export function lookZoom(factor: number) {
  if (Number.isFinite(factor) && factor > 0) pending.zoom *= factor;
}

/** What has gathered since the last frame, and starts afresh. */
export function takeLook(): Look {
  const look = { ...pending };
  pending.yaw = 0;
  pending.pitch = 0;
  pending.zoom = 1;
  return look;
}

export function lookIdle(look: Look) {
  return look.yaw === 0 && look.pitch === 0 && look.zoom === 1;
}

/** The camera's offset from its target after a look, kept inside PHOTO_LIMITS. Y is up. */
export function lookedOffset(offset: { x: number; y: number; z: number }, look: Look) {
  const radius = Math.hypot(offset.x, offset.y, offset.z);
  if (radius < 1e-6) return { ...offset };
  const theta = Math.atan2(offset.x, offset.z) + look.yaw;
  const phi = Math.min(PHOTO_LIMITS.maxPolar, Math.max(PHOTO_LIMITS.minPolar, Math.acos(Math.min(1, Math.max(-1, offset.y / radius))) + look.pitch));
  const distance = Math.min(PHOTO_LIMITS.maxDistance, Math.max(PHOTO_LIMITS.minDistance, radius * look.zoom));
  return {
    x: distance * Math.sin(phi) * Math.sin(theta),
    y: distance * Math.cos(phi),
    z: distance * Math.sin(phi) * Math.cos(theta),
  };
}
