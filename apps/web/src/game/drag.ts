/** The reel's drag: light gives a run line easily, heavy makes it fight for every foot. */
export type Drag = "light" | "normal" | "heavy";
export const DRAGS: readonly Drag[] = ["light", "normal", "heavy"];

/** The next drag setting, round from light to heavy and back. */
export function nextDrag(drag: Drag): Drag {
  return DRAGS[(DRAGS.indexOf(drag) + 1) % DRAGS.length];
}
