import type { SpotId, StanceId } from "@stillwater/shared";

export type ScenePoint = { x: number; z: number };

/** Mutable bridge from the frame-driven scene to the game hook. */
export type SceneState = {
  aim: ScenePoint | null;
  angler: ScenePoint | null;
  stance: StanceId | null;
  aimHint: SpotId | "shore" | null;
};

export type SceneStateRef = { current: SceneState };

export function initialSceneState(): SceneState {
  return { aim: null, angler: null, stance: null, aimHint: null };
}
