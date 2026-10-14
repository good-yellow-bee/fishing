export function listenForWaterAim(target: Window, onPoint: (event: PointerEvent) => void) {
  target.addEventListener("pointermove", onPoint);
  // Aim must be ready before the scene's cast handler consumes this press.
  target.addEventListener("pointerdown", onPoint, true);
  target.addEventListener("pointerup", onPoint, true);
  return () => {
    target.removeEventListener("pointermove", onPoint);
    target.removeEventListener("pointerdown", onPoint, true);
    target.removeEventListener("pointerup", onPoint, true);
  };
}

/** Everything the aim check reads besides the water's chop: pointer, camera, where the angler stands, boat state and level. */
export function aimInputs(
  pointer: { x: number; y: number },
  camera: { matrixWorld: { elements: ArrayLike<number> } },
  anglerX: number,
  anglerZ: number,
  mode: string,
  level: number,
): (number | string)[] {
  return [pointer.x, pointer.y, ...Array.from(camera.matrixWorld.elements), anglerX, anglerZ, mode, level];
}

/** Whether nothing the aim check reads has moved since `before`. An empty `before` never matches. */
export function sameAim(now: readonly (number | string)[], before: readonly (number | string)[]) {
  if (before.length === 0 || now.length !== before.length) return false;
  for (let i = 0; i < now.length; i += 1) if (now[i] !== before[i]) return false;
  return true;
}
