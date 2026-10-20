import { describe, expect, it } from "vitest";
import { SLACK_SAG, stakeNod, stakePose } from "./stakePose";

describe("the night line's stick and line by how the line stands", () => {
  const FOOT = 0.4;

  it("bows the stick's tip toward the water once a fish is on, the line straight and taut", () => {
    const soaking = stakePose("soaking", FOOT);
    const ready = stakePose("ready", FOOT);
    expect(ready.tip.y).toBeLessThan(soaking.tip.y - 0.1);
    expect(ready.tip.z).toBeGreaterThan(soaking.tip.z);
    expect(ready.joint).toEqual(soaking.joint);
    expect(ready.line).toHaveLength(2);
    expect(ready.line[0]).toEqual(ready.tip);
  });

  it("lets a line left too long hang slack, sagging below the straight one, still meeting the water", () => {
    const soaking = stakePose("soaking", FOOT);
    const stale = stakePose("stale", FOOT);
    expect(stale.tip).toEqual(soaking.tip);
    const middle = stale.line[(stale.line.length - 1) / 2];
    const straight = soaking.line[0].clone().lerp(soaking.line[1], 0.5);
    expect(middle.y).toBeCloseTo(straight.y - SLACK_SAG, 5);
    expect(middle.y).toBeGreaterThan(-FOOT);
    expect(stale.line.at(-1)).toEqual(soaking.line[1]);
  });

  it("knocks a ready stick toward the water only now and then, and never under reduced motion", () => {
    const nods = Array.from({ length: 1100 }, (_, i) => stakeNod(i / 100, false));
    expect(Math.min(...nods)).toBe(0);
    expect(Math.max(...nods)).toBeGreaterThan(0.05);
    expect(nods.filter((nod) => nod > 0).length).toBeLessThan(nods.length / 5);
    expect(nods.map((_, i) => stakeNod(i / 100, true)).every((nod) => nod === 0)).toBe(true);
  });
});
