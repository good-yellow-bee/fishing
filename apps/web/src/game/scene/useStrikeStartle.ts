import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { ScenePhase } from "./types";

/**
 * When a strike from the dock last startled a visiting bird, in clock seconds (-Infinity before any):
 * the first strike of each of its visits, as `visitOf` numbers them; later ones in the same visit find it gone.
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
