import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, inLake } from "@stillwater/shared";
import { LEAF_COLORS } from "./leafFall";
import { RAFT_COUNT, raftTurn, raftedLeaves } from "./raftedLeaves";

const EAST = { x: 0.08, z: 0 };
const CALM = { x: 0, z: 0 };

describe("fall leaves rafted on the water", () => {
  it("all float on the lake, each a fall colour", () => {
    const leaves = raftedLeaves(EAST);
    expect(leaves).toHaveLength(RAFT_COUNT);
    for (const leaf of leaves) {
      expect(inLake(leaf.x, leaf.z)).toBe(true);
      expect(LEAF_COLORS[leaf.color]).toBeDefined();
    }
    expect(raftedLeaves(EAST)).toEqual(leaves);
  });

  it("raft up against the bank the breeze blows onto", () => {
    const leaves = raftedLeaves(EAST);
    const eastBank = leaves.filter((l) => l.x > 12).length;
    const westBank = leaves.filter((l) => l.x < -12).length;
    expect(eastBank).toBeGreaterThan(westBank * 3);
    const south = raftedLeaves({ x: 0, z: 0.08 });
    expect(south.filter((l) => l.z > LAKE_CENTER_Z + 7).length).toBeGreaterThan(south.filter((l) => l.z < LAKE_CENTER_Z - 7).length * 3);
  });

  it("spread round the whole shore on a calm day", () => {
    const leaves = raftedLeaves(CALM);
    const east = leaves.filter((l) => l.x > 12).length;
    const west = leaves.filter((l) => l.x < -12).length;
    expect(Math.min(east, west)).toBeGreaterThan(5);
  });

  it("turn a little on the chop, and hold still for reduced motion", () => {
    const [leaf] = raftedLeaves(EAST);
    const turns = Array.from({ length: 60 }, (_, t) => raftTurn(leaf!, t));
    expect(Math.max(...turns) - Math.min(...turns)).toBeGreaterThan(0.2);
    expect(Math.max(...turns) - Math.min(...turns)).toBeLessThanOrEqual(0.5);
    expect(raftTurn(leaf!, 40, true)).toBe(leaf!.yaw);
  });
});
