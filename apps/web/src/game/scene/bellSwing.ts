import type { ScenePhase } from "./types";

/** Radians the bell swings at the first jolt of a nibble, and on the bite. */
export const NIBBLE_SWING = 0.35;
export const BITE_SWING = 0.7;
/** How fast the swing dies away, per second. */
export const SWING_DECAY = 5;
/** Swings a second: a small bell on a springy tip. */
export const SWING_HZ = 9;

/** The bell hangs from the rod tip only after dark, and only while a line is in the water. */
export function bellShown(night: boolean, phase: ScenePhase) {
  return night && (phase === "waiting" || phase === "hookset");
}

/** The bell's sideways tilt, `since` seconds after its last jolt; a bite jolts harder than a nibble. */
export function bellSwing(since: number, bite: boolean) {
  if (since < 0) return 0;
  const reach = bite ? BITE_SWING : NIBBLE_SWING;
  return reach * Math.exp(-SWING_DECAY * since) * Math.sin(since * SWING_HZ * Math.PI * 2);
}
