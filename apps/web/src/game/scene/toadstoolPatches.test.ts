import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { toadstoolPatches, toadstoolsOut } from "./toadstoolPatches";

const TREES = Array.from({ length: 30 }, (_, i) => {
  const a = (i / 30) * Math.PI * 2;
  return { position: [Math.cos(a) * 22, -0.08, Math.sin(a) * 16 - 2] as [number, number, number] };
});

describe("toadstools under the shore trees", () => {
  it("come up only in fall", () => {
    expect(toadstoolsOut("fall")).toBe(true);
    expect(toadstoolsOut("summer")).toBe(false);
    expect(toadstoolsOut("winter")).toBe(false);
    expect(toadstoolsOut("spring")).toBe(false);
  });

  it("grow in patches under some of the trees, not all", () => {
    const caps = toadstoolPatches(TREES);
    const under = new Set(caps.map((cap) => TREES.findIndex((tree) => Math.hypot(tree.position[0] - cap.x, tree.position[2] - cap.z) < 2)));
    expect(under.has(-1)).toBe(false);
    expect(under.size).toBeGreaterThan(5);
    expect(under.size).toBeLessThan(TREES.length - 5);
  });

  it("keep out of the water and off the trunk, one kind to a patch", () => {
    const caps = toadstoolPatches(TREES);
    for (const cap of caps) {
      expect(inLake(cap.x, cap.z)).toBe(false);
      const trunk = Math.min(...TREES.map((tree) => Math.hypot(tree.position[0] - cap.x, tree.position[2] - cap.z)));
      expect(trunk).toBeGreaterThan(0.4);
      expect(cap.height).toBeGreaterThan(0.04);
      expect(cap.height).toBeLessThan(0.14);
    }
    const byTree = new Map<number, Set<string>>();
    for (const cap of caps) {
      const t = TREES.findIndex((tree) => Math.hypot(tree.position[0] - cap.x, tree.position[2] - cap.z) < 2);
      byTree.set(t, (byTree.get(t) ?? new Set()).add(cap.kind));
    }
    for (const kinds of byTree.values()) expect(kinds.size).toBe(1);
  });

  it("are the same every time", () => {
    expect(toadstoolPatches(TREES)).toEqual(toadstoolPatches(TREES));
  });
});
