/**
 * The on-screen walking stick's push, read by the angler each frame:
 * x to the right, y forward (away from the camera), each -1..1, and 0, 0
 * when no thumb is on it.
 */
export const walkStick = { x: 0, y: 0 };

/** Below this share of the stick's reach, a resting thumb doesn't walk. */
export const STICK_DEADZONE = 0.15;

/** The push for a thumb `dx`, `dy` pixels from the stick's center (screen y runs down), on a stick `reach` pixels across its throw. */
export function stickPush(dx: number, dy: number, reach: number) {
  const length = Math.hypot(dx, dy);
  if (reach <= 0 || length < reach * STICK_DEADZONE) return { x: 0, y: 0 };
  const scale = Math.min(length, reach) / length / reach;
  return { x: dx * scale, y: -dy * scale };
}

export function releaseStick() {
  walkStick.x = 0;
  walkStick.y = 0;
}
