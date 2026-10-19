import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { ScenePhase } from "./types";

/**
 * When a strike from the dock last startled a visiting bird, in clock seconds (-Infinity before any):
 * the first strike of each of its visits, as `visitOf` numbers them; later ones in the same visit find it gone.
 * A strike while it is not sat there (flying off at its visit's end, or away) is recorded too; the bird's
 * pose function ignores those, and a visit starts with its arrival, so none can be spent before it comes.
 */
export function useStrikeStartle(phase: ScenePhase, atDock: boolean, visitOf: (time: number) => number) {
  const clock = useThree((state) => state.clock);
  const startledAt = useRef(-Infinity);
  useEffect(() => {
    if (phase !== "fight" || !atDock) return;
    const time = clock.elapsedTime;
    if (visitOf(startledAt.current) !== visitOf(time)) startledAt.current = time;
  }, [phase, atDock, clock, visitOf]);
  return startledAt;
}
