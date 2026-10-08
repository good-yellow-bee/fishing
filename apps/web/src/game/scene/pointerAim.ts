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
