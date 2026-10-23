import { t } from "../i18n";

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

/** A chip's label in the player's language. */
export function chipLabel(step: Exclude<WalkthroughStep, "landed">): string {
  switch (step) {
    case "aim":
      return t("Aim");
    case "charge":
      return t("Charge");
    case "wait":
      return t("Wait");
    case "strike":
      return t("Strike");
    case "ease":
      return t("Ease");
  }
}

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

/** The fight's steady line, also the one a screen reader hears for the whole fight. */
export function reelLine(): string {
  return t("Hold to reel it in. Let go when the Tension bar goes red.");
}

/** The one line under the chips for this step, in plain words for a child or a first-time player. */
export function stepLine(step: WalkthroughStep, snap: WalkthroughSnapshot): string {
  switch (step) {
    case "aim":
      if (!snap.fishing) return snap.touch ? t("Tap a signpost or the shore to walk to the water.") : t("Click a signpost or the shore, or use WASD, to walk to the water.");
      // Only the water in front of the bank casts; the far lake is another bank's.
      if (snap.cast === "range" || snap.cast === "basin") return snap.touch ? t("Too far. Touch the water closer in front of you.") : t("Too far. Point at the water closer in front of you.");
      if (snap.cast === "shore") return snap.touch ? t("That's land. Touch the water in front of you.") : t("That's land. Point at the water in front of you.");
      return snap.touch ? t("Touch the water close in front of you and hold.") : t("Point the mouse at the water close in front of you, or aim with the arrow keys.");
    case "charge":
      if (snap.outcome) return t("Not this time. Cast again.");
      if (snap.touch) return snap.phase === "casting" ? t("Keep holding. Lift your finger when the Cast bar reaches the green.") : t("Touch the water close in front of you and hold.");
      return snap.phase === "casting" ? t("Keep holding. Let go when the Cast bar reaches the green.") : t("Hold the mouse button or Space. Let go when the Cast bar reaches the green.");
    case "wait":
      if (snap.nibble) return t("Just a nibble. Not yet…");
      return snap.touch ? t("Wait for a bite. Tap only when it says Now!") : t("Wait for a bite. Click only when it says Now!");
    case "strike":
      return snap.touch ? t("Now! Tap.") : t("Now! Click or press Space.");
    case "ease":
      if (snap.surge === 2) return snap.reeling ? t("It's running. Let go!") : t("Good. Let it run, then reel again.");
      return reelLine();
    case "landed":
      return t("Your first fish. You've got it from here.");
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

/** Asked for again from Settings: it shows even with fish in the book, until the next fish or Skip. */
export function walkthroughAgain(userId: string) {
  try {
    return localStorage.getItem(walkthroughKey(userId)) === "again";
  } catch {
    return false;
  }
}

export function showWalkthroughAgain(userId: string) {
  try {
    localStorage.setItem(walkthroughKey(userId), "again");
  } catch {
    // Private mode: it still shows for this visit.
  }
}
