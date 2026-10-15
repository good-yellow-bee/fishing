import { describe, expect, it } from "vitest";
import { FISH, type FishSpecies } from "@stillwater/shared";
import { isCleanFight, isCloseCall, LAST_RUN_LINE, makeFight, SULK_MS, SULK_PUMP_SEC, SULK_REEL, PRESSURE_REEL, RED_TENSION, RUN_OUT_LINE, SPENT_STAMINA, staminaState, steerSide, TIGHT_TENSION, TIRING_STAMINA, tensionZone, WEED_MS, WEED_REEL, CURRENT_DRIFT, fightWater, type FightOutcome, type FightRuntime, type FightSim, type Steer } from "./fight";

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
/** Misses the warning and lets go only on LET GO or red, resuming once calm and back in the green. */
const lateOnRuns: Policy = (sim, reeling) => sim.surge !== 2 && sim.tension < (reeling ? RED_TENSION : 0.55);
/** Ignores runs entirely and reels whenever the bar is out of the red. */
const redOnly: Policy = (sim) => sim.tension < RED_TENSION;

const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);
const FRAME_SEC = 1 / 60;
const REACTION_FRAMES = 12;
const SLOW_REACTION_FRAMES = 15;

/** Plays a fight at 60 Hz (by default) where the angler's hand acts on what they saw 0.2 s (by default) earlier. */
function play(species: FishSpecies, weight: number, seed: number, policy: Policy, reactionFrames = REACTION_FRAMES, frameSec = FRAME_SEC) {
  const runtime = makeFight(species, weight, species.minStrength, seeded(seed));
  const hand: boolean[] = Array(reactionFrames).fill(false);
  let intent = false;
  for (let frame = 0; frame < 120 / frameSec; frame++) {
    intent = policy(runtime.sim, intent);
    hand.push(intent);
    const outcome = runtime.step(frame * frameSec * 1000, frameSec, hand.shift()!);
    if (outcome !== "fighting") {
      return { outcome, seconds: frame * frameSec, clean: outcome === "landed" && isCleanFight(runtime.performance) };
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

  it("counts the fight's length in game time, not wall-clock time", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
    let steps = 0;
    let outcome: FightOutcome = "fighting";
    // Frames 50 ms apart on the clock but only 0.05 s of game time each, as when the loop clamps a slow frame.
    for (let now = 0; outcome === "fighting" && now < 60_000; now += 50) {
      outcome = runtime.step(now, 0.05, runtime.sim.surge !== 2 && runtime.sim.tension < 0.6);
      steps++;
    }
    expect(outcome).toBe("landed");
    expect(runtime.performance.fightSec).toBeCloseTo(steps * 0.05);
  });

  it("counts the leaps the angler bowed to, and not one held tight", () => {
    const bowed = makeFight(fish("rainbow-trout"), 1.5, 2, () => 0);
    expect(land(bowed)).toBe("landed");
    expect(bowed.performance.bowedLeaps).toBeGreaterThan(0);

    const held = makeFight(fish("rainbow-trout"), 1.5, 2, () => 0);
    let outcome: FightOutcome = "fighting";
    let leaps = 0;
    for (let now = 0; outcome === "fighting" && now < 60_000; now += 50) {
      if (held.sim.jump && held.sim.surge === 2) leaps++;
      // Lets go on ordinary runs but holds the line through every leap.
      outcome = held.step(now, 0.05, held.sim.jump === true || (held.sim.surge !== 2 && held.sim.tension < 0.6));
    }
    expect(leaps).toBeGreaterThan(0);
    expect(held.performance.bowedLeaps).toBe(0);
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

  it("makes one last run at the net when reeled close with fight left in it", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
    runtime.step(0, 0, false);
    runtime.sim.line = LAST_RUN_LINE - 0.01;
    runtime.step(100, 0, true);
    expect(runtime.sim.surge).toBe(1);
    expect(runtime.sim.lastRun).toBe(true);
    let now = 100;
    while (runtime.sim.surge !== 0) runtime.step((now += 50), 0.05, false);
    expect(runtime.sim.lastRun).toBe(false);
    // Only once: back near the net, it comes in on the next calm.
    runtime.sim.line = LAST_RUN_LINE - 0.01;
    runtime.step((now += 16), 0.016, true);
    expect(runtime.sim.surge).toBe(0);
  });

  it("reels line in faster with the tension in the tight zone, and not in the red", () => {
    const reeled = (tension: number) => {
      const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
      runtime.step(0, 0, false);
      runtime.sim.tension = tension;
      runtime.step(10, 0.01, true);
      return 1 - runtime.sim.line;
    };
    expect(reeled(TIGHT_TENSION + 0.05) / reeled(0.2)).toBeCloseTo(PRESSURE_REEL, 2);
    expect(reeled(RED_TENSION + 0.05) / reeled(0.2)).toBeCloseTo(1, 2);
  });

  it("brings a played-out fish to the net without a last run", () => {
    const runtime = makeFight(fish("perch"), 0.8, 2, () => 0);
    runtime.step(0, 0, false);
    runtime.sim.stamina = SPENT_STAMINA - 0.05;
    runtime.sim.line = LAST_RUN_LINE - 0.01;
    runtime.step(100, 0, true);
    expect(runtime.sim.surge).toBe(0);
    expect(runtime.sim.lastRun).toBeFalsy();
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

  it("lands every non-starter fish but costs the clean bonus when the angler only watches the tension bar", () => {
    for (const species of FISH.filter((candidate) => candidate.challenge !== "mash")) {
      for (const weight of weights(species)) {
        const fights = SEEDS.map((seed) => play(species, weight, seed, barOnly));

        const label = `${species.id} ${weight} lb`;
        expect(fights.map((fight) => fight.outcome), label).toEqual(SEEDS.map(() => "landed"));
        expect(fights.filter((fight) => !fight.clean).length, label).toBeGreaterThan(SEEDS.length / 2);
      }
    }
  });

  it("lands starter fish, mostly clean, for an angler who only watches the tension bar", () => {
    for (const id of ["golden-shiner", "perch", "bluegill"]) {
      const species = fish(id);
      for (const weight of weights(species)) {
        const fights = SEEDS.map((seed) => play(species, weight, seed, barOnly));

        const label = `${id} ${weight} lb`;
        expect(fights.map((fight) => fight.outcome), label).toEqual(SEEDS.map(() => "landed"));
        expect(fights.filter((fight) => fight.clean).length, label).toBeGreaterThanOrEqual(SEEDS.length * 0.8);
      }
    }
  });

  it("never snaps a fish for a slow angler who lets go only on LET GO or a red bar", () => {
    for (const [name, policy] of Object.entries({ lateOnRuns, redOnly })) {
      for (const species of FISH) {
        for (const weight of weights(species)) {
          const fights = SEEDS.map((seed) => play(species, weight, seed, policy, SLOW_REACTION_FRAMES));

          const label = `${name} ${species.id} ${weight} lb`;
          expect(fights.map((fight) => fight.outcome), label).toEqual(SEEDS.map(() => "landed"));
        }
      }
    }
  });

  it("still saves the line on a prompt LET GO at 30 and 20 frames per second", () => {
    for (const fps of [30, 20]) {
      const frameSec = 1 / fps;
      for (const species of FISH) {
        for (const weight of weights(species)) {
          const fights = SEEDS.map((seed) => play(species, weight, seed, lateOnRuns, Math.round(0.25 / frameSec), frameSec));
          expect(fights.map((fight) => fight.outcome), `${fps} fps ${species.id} ${weight} lb`).toEqual(SEEDS.map(() => "landed"));
        }
      }
    }
  });
});


describe("tension zones", () => {
  it("names the bar's zone at its edges, matching the clean-fight line", () => {
    expect(tensionZone(0)).toBe("easy");
    expect(tensionZone(TIGHT_TENSION - 0.001)).toBe("easy");
    expect(tensionZone(TIGHT_TENSION)).toBe("tight");
    expect(tensionZone(RED_TENSION - 0.001)).toBe("tight");
    expect(tensionZone(RED_TENSION)).toBe("red");
    expect(tensionZone(1.2)).toBe("red");
  });
});

describe("stamina", () => {
  it("names how tired a fish is at its edges", () => {
    expect(staminaState(1)).toBe("fresh");
    expect(staminaState(TIRING_STAMINA)).toBe("fresh");
    expect(staminaState(TIRING_STAMINA - 0.001)).toBe("tiring");
    expect(staminaState(SPENT_STAMINA)).toBe("tiring");
    expect(staminaState(SPENT_STAMINA - 0.001)).toBe("spent");
  });

  it("wears a fish down while it is reeled and runs, and lets it rest on a slack line", () => {
    const runtime = makeFight(fish("catfish"), 20, 3, () => 0.5);
    for (let now = 0; now < 1000; now += 50) runtime.step(now, 0.05, true);
    const reeled = runtime.sim.stamina;
    expect(reeled).toBeLessThan(1);
    for (let now = 1000; now < 1200; now += 50) runtime.step(now, 0.05, false);
    expect(runtime.sim.surge).toBe(0);
    expect(runtime.sim.stamina).toBeGreaterThan(reeled);
  });

  it("plays out every big fish before it reaches the net, and its runs pull softer by then", () => {
    for (const species of FISH.filter((candidate) => candidate.challenge !== "mash")) {
      for (const seed of SEEDS) {
        const runtime = makeFight(species, species.maxWeight, species.minStrength, seeded(seed));
        const hand: boolean[] = Array(REACTION_FRAMES).fill(false);
        let intent = false;
        let lowest = 1;
        for (let frame = 0; frame < 120 / FRAME_SEC; frame++) {
          intent = releaseOnTelegraph(runtime.sim, intent);
          hand.push(intent);
          if (runtime.step(frame * FRAME_SEC * 1000, FRAME_SEC, hand.shift()!) !== "fighting") break;
          lowest = Math.min(lowest, runtime.sim.stamina);
        }
        expect(lowest, `${species.id} seed ${seed}`).toBeLessThan(TIRING_STAMINA);
      }
    }
  });

  it("tires a fish faster for a level 9 angler, but rests it the same", () => {
    const plain = makeFight(fish("pike"), 10, 3, () => 0.5);
    const keeper = makeFight(fish("pike"), 10, 3, () => 0.5, 1.2);
    plain.step(0, 1, true);
    keeper.step(0, 1, true);
    expect(1 - keeper.sim.stamina).toBeCloseTo((1 - plain.sim.stamina) * 1.2);
    const before = [plain.sim.stamina, keeper.sim.stamina];
    plain.step(1000, 0.5, false);
    keeper.step(1000, 0.5, false);
    expect(keeper.sim.stamina - before[1]!).toBeCloseTo(plain.sim.stamina - before[0]!);
  });

  it("lands a tired fish faster than a fresh one would come in", () => {
    const fresh = makeFight(fish("pike"), 10, 3, () => 0.5);
    const tired = makeFight(fish("pike"), 10, 3, () => 0.5);
    tired.sim.stamina = 0;
    fresh.step(0, 0.5, true);
    tired.step(0, 0.5, true);
    expect(1 - tired.sim.line).toBeGreaterThan((1 - fresh.sim.line) * 1.15);
  });
});

describe("turning runs", () => {
  /** Lets go on the telegraph and, if `turn` is set, pulls the rod against each run. */
  function playTurning(species: FishSpecies, weight: number, seed: number, turn: boolean) {
    const runtime = makeFight(species, weight, species.minStrength, seeded(seed));
    const hand: boolean[] = Array(REACTION_FRAMES).fill(false);
    let intent = false;
    let runs = 0;
    let wasRunning = false;
    for (let frame = 0; frame < 120 / FRAME_SEC; frame++) {
      intent = releaseOnTelegraph(runtime.sim, intent);
      hand.push(intent);
      const steer = turn && runtime.sim.surge === 2 ? (-runtime.sim.runSide as -1 | 1) : 0;
      const outcome = runtime.step(frame * FRAME_SEC * 1000, FRAME_SEC, hand.shift()!, steer);
      if (runtime.sim.surge === 2 && !wasRunning) runs += 1;
      wasRunning = runtime.sim.surge === 2;
      if (outcome !== "fighting") return { outcome, seconds: frame * FRAME_SEC, clean: isCleanFight(runtime.performance), runs, turnedRuns: runtime.performance.turnedRuns };
    }
    return { outcome: "fighting" as FightOutcome, seconds: 120, clean: false, runs, turnedRuns: runtime.performance.turnedRuns };
  }

  it("maps ← A to the left and → D to the right, and nothing else", () => {
    expect(steerSide("ArrowLeft")).toBe(-1);
    expect(steerSide("KeyA")).toBe(-1);
    expect(steerSide("ArrowRight")).toBe(1);
    expect(steerSide("KeyD")).toBe(1);
    expect(steerSide("Space")).toBeNull();
  });

  it("swings each run to the other side", () => {
    const runtime = makeFight(fish("pike"), 10, 3, () => 0.5);
    const sides: number[] = [];
    let prev = 0;
    for (let now = 0; now < 30_000; now += 50) {
      runtime.step(now, 0.05, false);
      if (runtime.sim.surge === 1 && prev === 0) sides.push(runtime.sim.runSide);
      prev = runtime.sim.surge;
    }
    expect(sides.length).toBeGreaterThan(3);
    sides.forEach((side, i) => i > 0 && expect(side).toBe(-sides[i - 1]!));
  });

  it("cuts runs short when the rod pulls against them, and only then", () => {
    const pike = fish("pike");
    const lengths: Record<string, number> = {};
    for (const pull of [0, 1, -1] as const) {
      const runtime = makeFight(pike, 10, 3, () => 0.5);
      let now = 0;
      while (runtime.sim.surge !== 2) runtime.step((now += 50), 0.05, false);
      const against = pull === -runtime.sim.runSide;
      let runMs = 0;
      while (runtime.sim.surge === 2) {
        runtime.step((now += 50), 0.05, false, pull);
        runMs += 50;
        if (runtime.sim.surge === 2) expect(runtime.sim.turning).toBe(against);
      }
      lengths[pull === 0 ? "straight" : against ? "against" : "with"] = runMs;
    }
    expect(lengths.with).toBe(lengths.straight);
    expect(lengths.against).toBeLessThan(lengths.straight! * 0.6);
  });

  it("never turns a leap", () => {
    const runtime = makeFight(fish("salmon"), 20, 5, () => 0.5);
    let now = 0;
    for (let i = 0; i < 2000 && !(runtime.sim.surge === 2 && runtime.sim.jump); i++) runtime.step((now += 50), 0.05, false);
    expect(runtime.sim.jump).toBe(true);
    runtime.step((now += 50), 0.05, false, (-runtime.sim.runSide) as -1 | 1);
    expect(runtime.sim.turning).toBe(false);
  });

  it("never turns a starter fish's head shake", () => {
    for (const species of FISH.filter((candidate) => candidate.challenge === "mash")) {
      for (const seed of SEEDS) {
        const fight = playTurning(species, species.maxWeight, seed, true);
        expect(fight.turnedRuns, species.id).toBe(0);
        expect(fight.outcome, species.id).toBe("landed");
      }
    }
  });

  it("lands every fish sooner, still landed and as clean, for an angler who turns each run", () => {
    for (const species of FISH.filter((candidate) => candidate.challenge !== "mash")) {
      const weight = species.maxWeight;
      const plain = SEEDS.map((seed) => playTurning(species, weight, seed, false));
      const turned = SEEDS.map((seed) => playTurning(species, weight, seed, true));
      const label = `${species.id} ${weight} lb`;
      expect(turned.map((fight) => fight.outcome), label).toEqual(SEEDS.map(() => "landed"));
      expect(turned.filter((fight) => fight.clean).length, label).toBeGreaterThanOrEqual(plain.filter((fight) => fight.clean).length);
      const average = (fights: { seconds: number }[]) => fights.reduce((sum, fight) => sum + fight.seconds, 0) / fights.length;
      expect(average(turned), label).toBeLessThan(average(plain) * 0.92);
      // The landed card counts the turned runs; a leap can't be turned, so it never counts.
      expect(plain.every((fight) => fight.turnedRuns === 0), label).toBe(true);
      for (const fight of turned) expect(fight.turnedRuns, label).toBeGreaterThan(0);
      for (const fight of turned) expect(fight.turnedRuns, label).toBeLessThanOrEqual(fight.runs);
    }
  });
});

describe("leaps", () => {
  /** Steps a fight with a fixed hand, recording each run's kind as it starts. */
  function runs(id: string, reeling: (sim: FightSim) => boolean, ms = 30_000) {
    const runtime = makeFight(fish(id), fish(id).minWeight, 20, seeded(7));
    const kinds: boolean[] = [];
    let before = 0;
    for (let now = 0; now < ms; now += 20) {
      const outcome = runtime.step(now, 0.02, reeling(runtime.sim));
      if (runtime.sim.surge === 2 && before !== 2) kinds.push(runtime.sim.jump === true);
      before = runtime.sim.surge;
      if (outcome !== "fighting") break;
    }
    return { kinds, runtime };
  }

  it("makes every second run of a trout, bass or salmon a leap, and never a pike's", () => {
    const trout = runs("rainbow-trout", () => false).kinds;
    expect(trout.length).toBeGreaterThan(3);
    trout.forEach((leap, i) => expect(leap, `run ${i}`).toBe(i % 2 === 1));
    expect(runs("pike", () => false).kinds.some(Boolean)).toBe(false);
  });

  it("loads the rod into the red when the line is held through a leap, but bowing keeps it clean", () => {
    const held = runs("smallmouth-bass", (sim) => sim.jump === true && sim.surge === 2, 12_000).runtime;
    expect(held.performance.peakTension).toBeGreaterThanOrEqual(RED_TENSION);
    const bowed = runs("smallmouth-bass", () => false, 12_000).runtime;
    expect(bowed.performance.peakTension).toBeLessThan(RED_TENSION);
  });
});

describe("close call", () => {
  it("is a fish landed with tension at the edge of a snap or the line at the edge of an escape", () => {
    expect(isCloseCall({ peakTension: 0.9, maxLine: 1.1 })).toBe(false);
    expect(isCloseCall({ peakTension: 0.96, maxLine: 1 })).toBe(true);
    expect(isCloseCall({ peakTension: 0.3, maxLine: RUN_OUT_LINE })).toBe(true);
  });
});

describe("sulking on the bottom", () => {
  /** Plays slack until the fish digs in, and returns when it did. */
  function untilSulk(runtime: FightRuntime) {
    for (let now = 0; now < 30_000; now += 50) {
      runtime.step(now, 0.05, false);
      if (runtime.sim.sulk) return now;
    }
    throw new Error("never sulked");
  }

  it("digs a bottom feeder in after its second run, where reeling barely moves it and no line goes out", () => {
    const runtime = makeFight(fish("carp"), 10, 3, () => 0);
    const at = untilSulk(runtime);
    expect(runtime.sim.surge).toBe(0);
    const line = runtime.sim.line;
    runtime.step(at + 50, 0.05, false);
    expect(runtime.sim.line).toBe(line);
    runtime.step(at + 100, 0.05, true);
    expect(runtime.sim.sulk).toBe(true);
    expect(line - runtime.sim.line).toBeGreaterThan(0);
    expect(line - runtime.sim.line).toBeLessThan(0.14 * 0.05 * SULK_REEL * 2);
  });

  it("comes up when the angler eases off and pumps, or on its own after a while", () => {
    const pumped = makeFight(fish("catfish"), 10, 3, () => 0);
    let now = untilSulk(pumped);
    for (const end = now + SULK_PUMP_SEC * 1000 + 50; now < end; now += 50) pumped.step(now, 0.05, false);
    expect(pumped.sim.sulk).toBe(true);
    pumped.step(now, 0.05, true);
    expect(pumped.sim.sulk).toBe(false);

    const waited = makeFight(fish("catfish"), 10, 3, () => 0);
    now = untilSulk(waited);
    waited.step(now + SULK_MS, 0.05, false);
    expect(waited.sim.sulk).toBe(false);
  });

  it("leaves every other fish to fight as before", () => {
    const runtime = makeFight(fish("largemouth-bass"), 3, 3, () => 0);
    for (let now = 0; now < 20_000; now += 50) {
      runtime.step(now, 0.05, false);
      expect(runtime.sim.sulk).toBeFalsy();
    }
  });
});

describe("runs into the weeds at the reeds", () => {
  /** Plays slack until the first run ends, steering against it the whole time or not at all. */
  function firstRun(runtime: FightRuntime, turn: boolean) {
    let ran = false;
    for (let now = 0; now < 30_000; now += 50) {
      const steer = turn && runtime.sim.surge === 2 ? (-runtime.sim.runSide as Steer) : 0;
      runtime.step(now, 0.05, false, steer);
      if (runtime.sim.surge === 2) ran = true;
      else if (ran && runtime.sim.surge === 0) return now;
    }
    throw new Error("never ran");
  }

  it("sends an unturned run into the weeds, where line comes in slowly and none goes out, until it comes free", () => {
    const runtime = makeFight(fish("pike"), 6, 3, () => 0, 1, "weeds");
    const at = firstRun(runtime, false);
    expect(runtime.sim.weeded).toBe(true);
    const line = runtime.sim.line;
    runtime.step(at + 50, 0.05, false);
    expect(runtime.sim.line).toBe(line);
    runtime.step(at + 100, 0.05, true);
    expect(line - runtime.sim.line).toBeGreaterThan(0);
    expect(line - runtime.sim.line).toBeLessThan(0.14 * 0.05 * WEED_REEL * 2);
    runtime.step(at + WEED_MS + 100, 0.05, false);
    expect(runtime.sim.weeded).toBe(false);
  });

  it("keeps a turned run out of the weeds, and open water never weeds a fish", () => {
    const turned = makeFight(fish("pike"), 6, 3, () => 0, 1, "weeds");
    firstRun(turned, true);
    expect(turned.sim.weeded).toBeFalsy();
    const open = makeFight(fish("pike"), 6, 3, () => 0);
    firstRun(open, false);
    expect(open.sim.weeded).toBeFalsy();
  });
});

describe("the inlet's current", () => {
  it("takes slack line out faster at the inlet than on open water", () => {
    const still = makeFight(fish("pike"), 6, 3, () => 0);
    const current = makeFight(fish("pike"), 6, 3, () => 0, 1, "current");
    still.step(0, 0.05, false);
    current.step(0, 0.05, false);
    still.step(50, 0.5, false);
    current.step(50, 0.5, false);
    expect(current.sim.line - 1).toBeCloseTo((still.sim.line - 1) * CURRENT_DRIFT);
  });

  it("gives the reeds weeds and the inlet a current", () => {
    expect(fightWater("reeds")).toBe("weeds");
    expect(fightWater("inlet")).toBe("current");
    expect(fightWater("dropoff")).toBe("deep");
    expect(fightWater("point")).toBe("rocks");
    expect(fightWater("dock")).toBe("open");
  });
});

describe("runs at the drop-off", () => {
  /** Reels through the first run and returns the tension and stamina it ended with. */
  function throughFirstRun(runtime: FightRuntime) {
    let ran = false;
    for (let now = 0; now < 30_000; now += 50) {
      runtime.step(now, 0.05, runtime.sim.surge !== 2);
      if (runtime.sim.surge === 2) ran = true;
      else if (ran) return runtime.sim.stamina;
    }
    throw new Error("never ran");
  }

  it("dives harder and tires the fish faster than on open water", () => {
    const open = makeFight(fish("pike"), 6, 3, () => 0);
    const deep = makeFight(fish("pike"), 6, 3, () => 0, 1, "deep");
    expect(throughFirstRun(deep)).toBeLessThan(throughFirstRun(open));
    const pullOpen = makeFight(fish("pike"), 6, 3, () => 0);
    const pullDeep = makeFight(fish("pike"), 6, 3, () => 0, 1, "deep");
    const at: number[] = [];
    for (const runtime of [pullOpen, pullDeep]) {
      let now = 0;
      for (; runtime.sim.surge !== 2 && now < 30_000; now += 50) runtime.step(now, 0.05, false);
      at.push(now);
    }
    const before = [pullOpen.sim.tension, pullDeep.sim.tension];
    pullOpen.step(at[0]!, 0.05, true);
    pullDeep.step(at[1]!, 0.05, true);
    expect(pullDeep.sim.tension - before[1]!).toBeGreaterThan(pullOpen.sim.tension - before[0]!);
  });
});

describe("runs off the point", () => {
  /** How much one reeling step, past the run's opening grace, loads the line. */
  function runPull(water: "open" | "rocks", steer: Steer) {
    const runtime = makeFight(fish("lake-whitefish"), 2, 3, () => 0, 1, water);
    let now = 0;
    for (; runtime.sim.surge !== 2 && now < 30_000; now += 50) runtime.step(now, 0.05, false);
    for (let i = 0; i < 7; i++, now += 50) runtime.step(now, 0.05, false);
    const before = runtime.sim.tension;
    runtime.step(now, 0.05, true, steer === 0 ? 0 : (-runtime.sim.runSide as Steer));
    expect(runtime.sim.surge).toBe(2);
    return runtime.sim.tension - before;
  }

  it("loads the line harder on a run left unturned, and no harder on a turned one", () => {
    expect(runPull("rocks", 0)).toBeGreaterThan(runPull("open", 0));
    expect(runPull("rocks", 1)).toBeCloseTo(runPull("open", 1));
  });
});
