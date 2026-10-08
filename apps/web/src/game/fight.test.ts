import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { isCleanFight, makeFight } from "./fight";

function fish(id: string) {
  const found = FISH.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing fixture fish: ${id}`);
  return found;
}

describe("makeFight", () => {
  it("returns each terminal outcome from the simulation state", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);

    runtime.sim.line = 0;
    expect(runtime.step(0, 0, false)).toBe("landed");

    runtime.sim.line = 1;
    runtime.sim.tension = 1;
    expect(runtime.step(1, 0, false)).toBe("snapped");

    runtime.sim.tension = 0;
    runtime.sim.line = 1.25;
    expect(runtime.step(2, 0, false)).toBe("escaped");
  });

  it("moves through its deterministic calm, warning, and surge pattern", () => {
    const runtime = makeFight(fish("brook-trout"), 1, 2, () => 0);

    expect(runtime.sim.surge).toBe(0);
    expect(runtime.step(0, 0, false)).toBe("fighting");
    expect(runtime.step(1200, 0, false)).toBe("fighting");
    expect(runtime.sim.surge).toBe(1);
    expect(runtime.step(1680, 0, false)).toBe("fighting");
    expect(runtime.sim.surge).toBe(2);
    expect(runtime.step(2380, 0, false)).toBe("fighting");
    expect(runtime.sim.surge).toBe(0);
  });

  it("reeling advances the line while a surge increases tension", () => {
    const runtime = makeFight(fish("pike"), 15, 1, () => 0);
    runtime.step(0, 0, false);
    runtime.step(1200, 0, false);
    runtime.step(1580, 0, false);
    const before = { ...runtime.sim };

    expect(runtime.step(1580, 0.1, true)).toBe("fighting");
    expect(runtime.sim.line).toBeLessThan(before.line);
    expect(runtime.sim.tension).toBeGreaterThan(before.tension);
  });

  it("makes sequence fish telegraph a second run soon after the first", () => {
    const runtime = makeFight(fish("catfish"), 6, 3, () => 0);
    runtime.step(0, 0, false);
    runtime.step(1200, 0, false);
    runtime.step(1460, 0, false);
    runtime.step(2160, 0, false);

    expect(runtime.sim.surge).toBe(0);
    runtime.step(2320, 0, false);
    expect(runtime.sim.surge).toBe(1);
  });

  it("records a clean fight until red tension or the escape limit is reached", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);

    expect(isCleanFight(runtime.performance)).toBe(true);
    runtime.sim.tension = 0.81;
    runtime.step(0, 0, false);
    expect(runtime.performance.peakTension).toBe(0.81);
    expect(isCleanFight(runtime.performance)).toBe(false);

    const lineRun = makeFight(fish("perch"), 0.8, 2, () => 0);
    lineRun.sim.line = 1.25;
    lineRun.step(0, 0, false);
    expect(lineRun.performance.reachedEscapeLine).toBe(true);
    expect(isCleanFight(lineRun.performance)).toBe(false);
  });
});
