import { inLake, type LakeSeason } from "@stillwater/shared";
import { nearCreek } from "./creek";

/** Toadstools come up under the trees in fall and are gone by the frosts. */
export function toadstoolsOut(season: LakeSeason) {
  return season === "fall";
}

export const TOADSTOOL_KINDS = ["fly-agaric", "brown", "tan"] as const;
export type ToadstoolKind = (typeof TOADSTOOL_KINDS)[number];

export type Toadstool = { x: number; z: number; height: number; cap: number; tilt: number; lean: number; kind: ToadstoolKind };

/** How far from a trunk the patch grows, in metres: out under the crown, not against the bark. */
const NEAR = 0.8;
const FAR = 1.5;

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 91.7 + salt * 47.3) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * A little patch of toadstools at the foot of about half the given trees: three to six caps
 * clustered on one side of the trunk, one kind to a patch, never in the lake or the creek.
 * The same trees always give the same patches.
 */
export function toadstoolPatches(trees: readonly { position: readonly [number, number, number] }[]): Toadstool[] {
  const out: Toadstool[] = [];
  trees.forEach((tree, t) => {
    if (seeded(t, 1) > 0.5) return;
    const [tx, , tz] = tree.position;
    const side = seeded(t, 2) * Math.PI * 2;
    const reach = NEAR + seeded(t, 3) * (FAR - NEAR);
    const cx = tx + Math.cos(side) * reach;
    const cz = tz + Math.sin(side) * reach;
    const kind = TOADSTOOL_KINDS[Math.floor(seeded(t, 4) * TOADSTOOL_KINDS.length)]!;
    const count = 3 + Math.floor(seeded(t, 5) * 4);
    for (let i = 0; i < count; i += 1) {
      const k = t * 10 + i;
      const a = seeded(k, 6) * Math.PI * 2;
      const r = Math.sqrt(seeded(k, 7)) * 0.32;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (inLake(x, z) || nearCreek(x, z, 0.3)) continue;
      // One or two big ones in a patch, the rest small and young.
      const big = i < 2;
      out.push({
        x,
        z,
        height: (big ? 0.09 : 0.05) + seeded(k, 8) * 0.04,
        cap: (big ? 0.06 : 0.035) + seeded(k, 9) * 0.02,
        tilt: (seeded(k, 10) - 0.5) * 0.35,
        lean: seeded(k, 11) * Math.PI * 2,
        kind,
      });
    }
  });
  return out;
}
