import type { LakeSeason } from "@stillwater/shared";
import { DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { BRIDGE_SCALE, BRIDGE_SPANS } from "./pierDeck";

/** bridge_wood.glb: its four posts sit this far out from the centre and rise this high, before scale (the node sits 0.05 down). */
const POST_OFFSET = 0.45;
const POST_TOP = 0.35;
const POST_SIDE = 0.14;

export type SnowCap = { x: number; y: number; z: number; size: number };

/** Snow lies on the dock all winter. */
export function dockSnowy(season: LakeSeason) {
  return season === "winter";
}

/** A cap of snow on top of each bridge post. */
export const DOCK_POST_CAPS: readonly SnowCap[] = BRIDGE_SPANS.flatMap((z) =>
  [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => ({
      x: sx * POST_OFFSET * BRIDGE_SCALE,
      y: POST_TOP * BRIDGE_SCALE,
      z: z + sz * POST_OFFSET * BRIDGE_SCALE,
      size: POST_SIDE * BRIDGE_SCALE,
    })),
  ),
);

/** Trodden prints around where the angler stands, toe toward the lake; offsets in metres and a yaw. */
export const DOCK_PRINTS: readonly { x: number; z: number; yaw: number }[] = [
  { x: DOCK_STAND_X - 0.16, z: DOCK_STAND_Z + 0.05, yaw: 0.05 },
  { x: DOCK_STAND_X + 0.16, z: DOCK_STAND_Z - 0.02, yaw: -0.08 },
  { x: DOCK_STAND_X - 0.12, z: DOCK_STAND_Z + 0.55, yaw: 0.12 },
  { x: DOCK_STAND_X + 0.1, z: DOCK_STAND_Z + 0.95, yaw: -0.04 },
  { x: DOCK_STAND_X - 0.08, z: DOCK_STAND_Z + 1.35, yaw: 0.02 },
];
