import type { ScenePhase } from "./scene/types";

/** Idle and the charge are still on the bank. Flight, fight, and landing keep the lure. */
export function lureCanChange(phase: ScenePhase): boolean {
  return phase === "idle" || phase === "casting";
}
