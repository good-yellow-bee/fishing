import type { LakeHour } from "@stillwater/shared";

/**
 * Line and float colours that read against the water. The daytime line is
 * dark against bright water; on dark water it turns pale, like monofilament
 * catching the moon, and the float wears a glowing night tip.
 */
export type LineLook = {
  line: string;
  /** Resting line opacity; a hard run still pulls it to full. */
  opacity: number;
  /** A small lit tip on the float. */
  glowTip: boolean;
};

const DAY_LINE: LineLook = { line: "#1a1410", opacity: 0.55, glowTip: false };
const DIM_LINE: LineLook = { line: "#d9cdb4", opacity: 0.62, glowTip: true };
const NIGHT_LINE: LineLook = { line: "#e2ecf2", opacity: 0.72, glowTip: true };

export const GLOW_TIP = "#d8ff6a";

/**
 * By the hour: dusk and night water is about half and a quarter as bright as
 * day water under every sky, so the dark line vanishes into it.
 */
export function lineLook(hour: LakeHour): LineLook {
  if (hour === "night") return NIGHT_LINE;
  if (hour === "dusk") return DIM_LINE;
  return DAY_LINE;
}
