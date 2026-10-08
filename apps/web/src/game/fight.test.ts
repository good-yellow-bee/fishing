import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { isCleanFight, makeFight, RED_TENSION, type FightOutcome, type FightRuntime } from "./fight";

function fish(id: string) {
  const found = FISH.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing fixture fish: ${id}`);
  return found;
}

/** Reels in calm water below 0.6 tension and eases off otherwise, like a careful angler. */
function land(runtime: FightRuntime, fromMs = 0): FightOutcome {
  let outcome: FightOutcome = "fighting";
  for (let now = fromMs; outcome === "fighting" && now < fromMs + 60_000; now += 50) {
    outcome = runtime.step(now, 0.05, runtime.sim.surge !== 2 && runtime.sim.tension < 0.6);
  }
  return outcome;
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

  it("lands a clean fight when tension stays out of the red and line never runs out", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);

    expect(land(runtime)).toBe("landed");
    expect(runtime.performance.peakTension).toBeLessThan(RED_TENSION);
    expect(runtime.performance.maxLine).toBe(1);
    expect(isCleanFight(runtime.performance)).toBe(true);
  });

  it("lands an unclean fight after the fish takes line past the hookset", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
    runtime.step(0, 0, false);
    runtime.step(1000, 1, false);

    expect(runtime.sim.line).toBeGreaterThan(1);
    expect(land(runtime, 1000)).toBe("landed");
    expect(runtime.performance.peakTension).toBeLessThan(RED_TENSION);
    expect(isCleanFight(runtime.performance)).toBe(false);
  });

  it("marks a fight unclean once tension reaches the red band", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
    runtime.sim.tension = RED_TENSION;
    runtime.step(0, 0, false);
    runtime.sim.line = 0;

    expect(runtime.step(1, 0, false)).toBe("landed");
    expect(runtime.performance.peakTension).toBe(RED_TENSION);
    expect(isCleanFight(runtime.performance)).toBe(false);
  });
});
