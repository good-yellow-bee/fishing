import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { EGGS_PER_CLUMP, EGG_SIZE, SPAWN_CLUMPS, clumpsAfloat, spawnEggs, spawnOut } from "./spawnClumps";

describe("frogspawn", () => {
  it("floats on the water in spring only", () => {
    expect(spawnOut("spring")).toBe(true);
    for (const season of ["summer", "fall", "winter"] as const) expect(spawnOut(season)).toBe(false);
    expect(clumpsAfloat()).toBe(true);
  });

  it("packs each clump's eggs in a mound, on the water and hardly overlapping", () => {
    const eggs = spawnEggs();
    expect(eggs).toHaveLength(SPAWN_CLUMPS.length * EGGS_PER_CLUMP);
    for (const egg of eggs) expect(inLake(egg.x, egg.z)).toBe(true);
    const clump = eggs.filter((e) => e.clump === 0);
    let close = 0;
    clump.forEach((a, i) => clump.slice(i + 1).forEach((b) => (close += Math.hypot(a.x - b.x, a.z - b.z) < EGG_SIZE * 0.5 ? 1 : 0)));
    expect(close).toBeLessThan(EGGS_PER_CLUMP * 0.05);
    const middle = clump[0]!;
    const edge = clump[clump.length - 1]!;
    expect(middle.lift).toBeGreaterThan(edge.lift);
  });
});
