import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, lakeEdge } from "@stillwater/shared";
import { LEAF_COLORS } from "./leafFall";
import { pollenHeading } from "./pollenDrift";

/** Leaves rafted against the downwind bank. */
export const RAFT_SHORE = 70;
/** Stray leaves still afloat out on the open water. */
export const RAFT_STRAYS = 16;
export const RAFT_COUNT = RAFT_SHORE + RAFT_STRAYS;

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type RaftLeaf = { x: number; z: number; yaw: number; color: number; size: number; bob: number };

/**
 * Where the fall's fallen leaves lie afloat: most rafted up in the shallows of the bank the breeze
 * blows onto, in a band a few meters wide, and a few strays out on the open water. A calm day
 * spreads the raft evenly round the shore. Every leaf is on the water.
 */
export function raftedLeaves(wind: { x: number; z: number }): RaftLeaf[] {
  const head = pollenHeading(wind);
  const calm = Math.hypot(wind.x, wind.z) < 1e-3;
  const leaves: RaftLeaf[] = [];
  for (let i = 0; leaves.length < RAFT_SHORE && i < RAFT_SHORE * 20; i += 1) {
    const angle = seeded(i, 1) * Math.PI * 2;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    // Keep a bank's leaves in proportion to how squarely it faces downwind.
    const facing = (nx * head.x + nz * head.z + 1) / 2;
    if (!calm && seeded(i, 2) > facing ** 3) continue;
    const reach = lakeEdge(angle) * (0.93 - seeded(i, 3) * 0.12);
    const x = nx * reach * LAKE_RX;
    const z = LAKE_CENTER_Z + nz * reach * LAKE_RZ;
    if (!inLake(x, z)) continue;
    leaves.push(leaf(i, x, z));
  }
  for (let i = 0; leaves.length < RAFT_COUNT && i < RAFT_STRAYS * 20; i += 1) {
    const x = (seeded(i, 4) * 2 - 1) * LAKE_RX * 0.8;
    const z = LAKE_CENTER_Z + (seeded(i, 5) * 2 - 1) * LAKE_RZ * 0.8;
    if (inLake(x, z)) leaves.push(leaf(i + 500, x, z));
  }
  return leaves;
}

function leaf(i: number, x: number, z: number): RaftLeaf {
  return {
    x,
    z,
    yaw: seeded(i, 6) * Math.PI * 2,
    color: Math.floor(seeded(i, 7) * LEAF_COLORS.length),
    size: 0.75 + seeded(i, 8) * 0.5,
    bob: seeded(i, 9) * Math.PI * 2,
  };
}

/** A rafted leaf's slow turn on the chop, in radians, `time` seconds in; still for reduced motion. */
export function raftTurn(leaf: RaftLeaf, time: number, still = false) {
  return still ? leaf.yaw : leaf.yaw + Math.sin(time * 0.3 + leaf.bob) * 0.25;
}
