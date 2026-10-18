import { inLake, type LakeSeason } from "@stillwater/shared";
import { waterDepth } from "./water";

/** Sodden leaves lying on the bed: the fall colours, darkened by the water. */
export const SUNK_COLORS = ["#5e3b1e", "#55291e", "#5f4d22", "#45291a"] as const;
export const SUNK_COUNT = 90;
/** The patch of clear shallows round the dock they settle in, in metres. */
const PATCH = { x: 0, z: 5.6, rx: 4.2, rz: 2.2 } as const;
/** Only where the bed shows through: the sandy shelf, not out over the drop. */
const MAX_DEPTH = 0.42;

/** Fall's leaves sink and lie on the bed through the winter; by spring they have rotted away. */
export function sunkenLeavesOut(season: LakeSeason) {
  return season === "fall" || season === "winter";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type SunkLeaf = { x: number; z: number; turn: number; size: number; color: number };

/** Every sunken leaf: scattered over the shallow bed round the dock, none on dry land. */
export function sunkenLeaves(): SunkLeaf[] {
  const leaves: SunkLeaf[] = [];
  for (let i = 0; leaves.length < SUNK_COUNT && i < SUNK_COUNT * 6; i += 1) {
    const angle = seeded(i, 1) * Math.PI * 2;
    const reach = Math.sqrt(seeded(i, 2));
    const x = PATCH.x + Math.cos(angle) * PATCH.rx * reach;
    const z = PATCH.z + Math.sin(angle) * PATCH.rz * reach;
    const depth = waterDepth(x, z);
    if (!inLake(x, z) || depth <= 0.02 || depth > MAX_DEPTH) continue;
    leaves.push({ x, z, turn: seeded(i, 3) * Math.PI * 2, size: 0.8 + seeded(i, 4) * 0.5, color: Math.floor(seeded(i, 5) * SUNK_COLORS.length) });
  }
  return leaves;
}
