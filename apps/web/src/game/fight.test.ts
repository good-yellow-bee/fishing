import { describe, expect, it } from "vitest";
import { FISH, type FishSpecies } from "@stillwater/shared";
import { isCleanFight, makeFight, RED_TENSION, RUN_OUT_LINE, type FightOutcome, type FightRuntime, type FightSim } from "./fight";

function fish(id: string) {
  const found = FISH.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing fixture fish: ${id}`);
  return found;
}

/** Reels in calm water below 0.6 tension and lets go from the telegraph on, like a careful angler. */
function land(runtime: FightRuntime, fromMs = 0): FightOutcome {
  let outcome: FightOutcome = "fighting";
  for (let now = fromMs; outcome === "fighting" && now < fromMs + 60_000; now += 50) {
    outcome = runtime.step(now, 0.05, runtime.sim.surge === 0 && runtime.sim.tension < 0.6);
  }
  return outcome;
}

/** Deterministic random source (mulberry32) so each seed replays the same fish. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Policy = (sim: FightSim, reeling: boolean) => boolean;

const releaseOnTelegraph: Policy = (sim) => sim.surge === 0 && sim.tension < 0.7;
/** Ignores surges; 0.6 leaves room for the reaction delay, so calm water alone never turns the bar red. */
const barOnly: Policy = (sim, reeling) => sim.tension < (reeling ? 0.6 : 0.45);

const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);
const FRAME_SEC = 1 / 60;
const REACTION_FRAMES = 12;

/** Plays a fight at 60 Hz where the angler's hand acts on what they saw 0.2 s earlier. */
function play(species: FishSpecies, weight: number, seed: number, policy: Policy) {
  const runtime = makeFight(species, weight, species.minStrength, seeded(seed));
  const hand: boolean[] = Array(REACTION_FRAMES).fill(false);
  let intent = false;
  for (let frame = 0; frame < 120 / FRAME_SEC; frame++) {
    intent = policy(runtime.sim, intent);
    hand.push(intent);
    const outcome = runtime.step(frame * FRAME_SEC * 1000, FRAME_SEC, hand.shift()!);
    if (outcome !== "fighting") {
      return { outcome, seconds: frame * FRAME_SEC, clean: outcome === "landed" && isCleanFight(runtime.performance) };
    }
  }
  return { outcome: "fighting" as FightOutcome, seconds: 120, clean: false };
}

function weights(species: FishSpecies) {
  return [species.minWeight, (species.minWeight + species.maxWeight) / 2, species.maxWeight];
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

  it("stays clean when a hookset tap leaves the line idle before reeling", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
    let now = 0;
    for (; now <= 720; now += 16) runtime.step(now, 0.016, false);

    expect(runtime.performance.maxLine).toBeGreaterThan(1);
    expect(land(runtime, now)).toBe("landed");
    expect(runtime.performance.peakTension).toBeLessThan(RED_TENSION);
    expect(isCleanFight(runtime.performance)).toBe(true);
  });

  it("lands an unclean fight after the fish nearly runs out the line", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
    let now = 0;
    for (; runtime.sim.line < RUN_OUT_LINE; now += 50) expect(runtime.step(now, 0.05, false)).toBe("fighting");

    expect(land(runtime, now)).toBe("landed");
    expect(runtime.performance.peakTension).toBeLessThan(RED_TENSION);
    expect(runtime.performance.maxLine).toBeGreaterThanOrEqual(RUN_OUT_LINE);
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

describe("surges", () => {
  it("lands every species, mostly clean, for an angler who lets go on the telegraph", () => {
    for (const species of FISH) {
      for (const weight of weights(species)) {
        const fights = SEEDS.map((seed) => play(species, weight, seed, releaseOnTelegraph));

        const label = `${species.id} ${weight} lb`;
        expect(fights.map((fight) => fight.outcome), label).toEqual(SEEDS.map(() => "landed"));
        expect(fights.filter((fight) => fight.clean).length, label).toBeGreaterThanOrEqual(SEEDS.length * 0.8);
      }
    }
  });

  it("lands a mid-size sturgeon in about 25 seconds when played by the telegraph", () => {
    const sturgeon = fish("sturgeon");
    const fights = SEEDS.map((seed) => play(sturgeon, 50, seed, releaseOnTelegraph));
    const average = fights.reduce((sum, fight) => sum + fight.seconds, 0) / fights.length;

    expect(average).toBeGreaterThan(18);
    expect(average).toBeLessThan(32);
  });

  it("costs pike and sturgeon the clean bonus when the angler only watches the tension bar", () => {
    for (const id of ["pike", "sturgeon"]) {
      const species = fish(id);
      for (const weight of weights(species)) {
        const fights = SEEDS.map((seed) => play(species, weight, seed, barOnly));

        expect(fights.filter((fight) => !fight.clean).length, `${id} ${weight} lb`).toBeGreaterThan(SEEDS.length / 2);
      }
    }
  });

  it("never snaps a starter fish for an angler who only watches the tension bar", () => {
    for (const id of ["golden-shiner", "perch", "bluegill"]) {
      const species = fish(id);
      for (const weight of weights(species)) {
        const fights = SEEDS.map((seed) => play(species, weight, seed, barOnly));

        expect(fights.map((fight) => fight.outcome), `${id} ${weight} lb`).toEqual(SEEDS.map(() => "landed"));
      }
    }
  });
});
