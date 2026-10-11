/**
 * The first-cast walkthrough. Five chips light up as a new angler does each
 * thing once: aim, charge, wait for the real dip, strike, ease on the run.
 * Landing the first fish ends it for good.
 */

export type WalkthroughStep = "aim" | "charge" | "wait" | "strike" | "ease" | "landed";

/** The chips, in order. Landed has no chip; it is the send-off. */
export const WALKTHROUGH_CHIPS: readonly { step: Exclude<WalkthroughStep, "landed">; label: string }[] = [
  { step: "aim", label: "Aim" },
  { step: "charge", label: "Charge" },
  { step: "wait", label: "Wait" },
  { step: "strike", label: "Strike" },
  { step: "ease", label: "Ease" },
];

export type WalkthroughSnapshot = {
  /** Standing on a bank, so the water can be aimed at. */
  fishing: boolean;
  phase: "idle" | "casting" | "waiting" | "hookset" | "fight" | "result";
  /** The scene's aim state; "ok" when the ring sits on castable water. */
  cast: string | undefined;
  nibble: boolean;
  /** 2 while the fish is running. */
  surge: number;
  reeling: boolean;
  /** A finger, not a mouse and keyboard. */
  touch: boolean;
  outcome: "landed" | "miss" | "broke" | "error" | null;
};

/** Where the walkthrough stands after this snapshot. A lost fish sends it back to the cast; a landed one ends it. */
export function nextStep(step: WalkthroughStep, snap: WalkthroughSnapshot): WalkthroughStep {
  if (step === "landed" || snap.outcome === "landed") return "landed";
  if (snap.outcome) return "charge";
  switch (snap.phase) {
    case "casting":
      return "charge";
    case "waiting":
      return "wait";
    case "hookset":
      return "strike";
    case "fight":
      return "ease";
    default:
      return snap.fishing && snap.cast === "ok" ? "charge" : "aim";
  }
}

/** The one line under the chips for this step. */
export function stepLine(step: WalkthroughStep, snap: WalkthroughSnapshot): string {
  switch (step) {
    case "aim":
      return snap.fishing ? "Point at open water until the ring shows." : "Walk onto a bank: tap a signpost, the shore, or use WASD.";
    case "charge":
      if (snap.outcome) return "It got away. Cast again.";
      return snap.touch ? "Hold a finger on the water, and lift it in the moss band." : "Hold the mouse or Space, and let go in the moss band.";
    case "wait":
      return snap.nibble ? "Just a nibble. Not yet…" : "Wait. A nibble comes first; strike on the real dip.";
    case "strike":
      return snap.touch ? "Now! Tap." : "Now! Click or press Space.";
    case "ease":
      if (snap.surge === 2) return snap.reeling ? "It's running. Let go!" : "Good. Let it run, then reel again.";
      return "Hold to reel it in. Ease off when the line runs hot.";
    case "landed":
      return "Your first fish. You've got it from here.";
  }
}

export function walkthroughKey(userId: string) {
  return `stillwater.walkthrough.${userId}.v1`;
}

export function walkthroughDone(userId: string) {
  try {
    return localStorage.getItem(walkthroughKey(userId)) === "done";
  } catch {
    return false;
  }
}

export function finishWalkthrough(userId: string) {
  try {
    localStorage.setItem(walkthroughKey(userId), "done");
  } catch {
    // Private mode: the walkthrough just shows again next visit.
  }
}
