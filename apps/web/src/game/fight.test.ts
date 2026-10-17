import { describe, expect, it } from "vitest";
import { FISH, type FishSpecies } from "@stillwater/shared";
import { BREACHERS, BROADSIDE_REEL, BROADSIDERS, QUIT_TIRE, QUITTERS, SCRAPPER_TIRE, SCRAPPERS, isCleanFight, isCloseCall, LAST_RUN_LINE, makeFight, SULK_MS, SULK_PUMP_SEC, SULK_REEL, PRESSURE_REEL, RED_TENSION, RUN_OUT_LINE, SPENT_STAMINA, staminaState, steerSide, TIGHT_TENSION, TIRING_STAMINA, tensionZone, WEED_MS, WEED_REEL, CURRENT_DRIFT, FLOOD_DRIFT, floodedInlet, BOAT_RUN, WIND_SLACK, WINTER_TIRE, seasonTireMul, thrivesInCold, COLD_LOVERS, SUMMER_TIRE, COLDWATER, warmTireMul, rainCooled, deepCooled, FALL_RUN_TIRE, FALL_RUNNERS, runTireMul, SPRING_RUN_TIRE, SPRING_RUNNERS, springRunTireMul, NEST_TIRE, NEST_GUARDERS, nestTireMul, NIGHT_HUNTER_TIRE, NIGHT_HUNTERS, nightTireMul, SPAWN_SPENT_TIRE, EARLY_SPAWNERS, spentTireMul, TWILIGHT_HUNTER_TIRE, TWILIGHT_HUNTERS, twilightTireMul, ROLL_MS, JUMP_GRACE_SEC, FIRST_RUN_LONGER, TEAR_SEC, PAPER_TEAR_SEC, TREBLE_HOLD, fightWind, fightWater, type FightOutcome, type FightRuntime, type FightSim, type Steer, WRAP_MS, WRAP_PULL, DOWNSTREAM_RUN, DOWNSTREAM_SIDE, JUMP_MS, TAIL_WALK, COVER_HOLD, SHAKE_MS, SHAKE_GRACE_SEC } from "./fight";

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

const releaseOnTelegraph: Policy = (sim) => sim.surge === 0 && !sim.shake && sim.tension < 0.7;
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

  it("makes a second run at the net when it's trophy-sized", () => {
    const runtime = makeFight(fish("perch"), 1.2, 2, () => 0);
    runtime.step(0, 0, false);
    let now = 0;
    for (const encore of [false, true]) {
      runtime.sim.line = LAST_RUN_LINE - 0.01;
      runtime.step((now += 100), 0, true);
      expect(runtime.sim.lastRun).toBe(true);
      expect(runtime.sim.encore).toBe(encore);
      expect(runtime.performance.encore).toBe(encore || undefined);
      while (runtime.sim.surge !== 0) runtime.step((now += 50), 0.05, false);
      expect(runtime.sim.encore).toBe(false);
    }
    // Twice is all: the third time near the net it comes in.
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
  function runs(id: string, reeling: (sim: FightSim) => boolean, ms = 30_000, topwater = false) {
    const runtime = makeFight(fish(id), fish(id).minWeight, 20, seeded(7), 1, "open", undefined, topwater);
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

  it("makes a rainbow trout's first leap a long tail-walk, and only that one", () => {
    const runtime = makeFight(fish("rainbow-trout"), fish("rainbow-trout").minWeight, 20, seeded(7));
    const leaps: { walk: boolean; ms: number }[] = [];
    let start = 0;
    let before = 0;
    let leap = false;
    let walk = false;
    for (let now = 0; now < 30_000; now += 20) {
      if (runtime.step(now, 0.02, false) !== "fighting") break;
      if (runtime.sim.surge === 2 && before !== 2) {
        start = now;
        leap = runtime.sim.jump === true;
        walk = runtime.sim.tailWalk === true;
      }
      if (runtime.sim.surge !== 2 && before === 2 && leap) leaps.push({ walk, ms: now - start });
      before = runtime.sim.surge;
    }
    expect(leaps.length).toBeGreaterThan(1);
    expect(leaps.map((l) => l.walk)).toEqual([true, ...leaps.slice(1).map(() => false)]);
    expect(leaps[0]!.ms).toBeCloseTo(JUMP_MS * TAIL_WALK, -2);
    expect(leaps[1]!.ms).toBeCloseTo(JUMP_MS, -2);
  });

  it("makes every second run of a trout, bass or salmon a leap, and never a pike's", () => {
    const trout = runs("rainbow-trout", () => false).kinds;
    expect(trout.length).toBeGreaterThan(3);
    trout.forEach((leap, i) => expect(leap, `run ${i}`).toBe(i % 2 === 1));
    expect(runs("pike", () => false).kinds.some(Boolean)).toBe(false);
  });

  it("has a jumper hooked on a topwater lure leap on its first run and every second one after", () => {
    const bass = runs("largemouth-bass", () => false, 30_000, true).kinds;
    expect(bass.length).toBeGreaterThan(3);
    bass.forEach((leap, i) => expect(leap, `run ${i}`).toBe(i % 2 === 0));
    // A fish that never jumps stays down whatever it took.
    expect(runs("pike", () => false, 30_000, true).kinds.some(Boolean)).toBe(false);
  });

  it("keeps a jumper down in winter's cold water, even on a topwater", () => {
    const leaps = (cold: boolean, topwater: boolean) => {
      const runtime = makeFight(fish("largemouth-bass"), fish("largemouth-bass").minWeight, 20, seeded(7), 1, "open", undefined, topwater, false, cold);
      const kinds: boolean[] = [];
      let before = 0;
      for (let now = 0; now < 30_000; now += 20) {
        const outcome = runtime.step(now, 0.02, false);
        if (runtime.sim.surge === 2 && before !== 2) kinds.push(runtime.sim.jump === true);
        before = runtime.sim.surge;
        if (outcome !== "fighting") break;
      }
      return kinds;
    };
    for (const topwater of [false, true]) {
      expect(leaps(false, topwater).some(Boolean)).toBe(true);
      const cold = leaps(true, topwater);
      expect(cold.length).toBeGreaterThan(1);
      expect(cold.some(Boolean)).toBe(false);
    }
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
    const pumped = makeFight(fish("carp"), 10, 3, () => 0);
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

  it("takes two pumps to lift a catfish off the bottom", () => {
    const catfish = makeFight(fish("catfish"), 10, 3, () => 0);
    let now = untilSulk(catfish);
    const pump = () => {
      for (const end = now + SULK_PUMP_SEC * 1000 + 50; now < end; now += 50) catfish.step(now, 0.05, false);
      catfish.step(now, 0.05, true);
      now += 50;
    };
    pump();
    expect(catfish.sim.sulk).toBe(true);
    expect(catfish.sim.lifting).toBe(true);
    pump();
    expect(catfish.sim.sulk).toBe(false);
    expect(catfish.sim.lifting).toBe(false);
  });

  it("keeps a stuck catfish on the bottom, with no run, till it comes up on its own", () => {
    const catfish = makeFight(fish("catfish"), 10, 3, () => 0);
    const at = untilSulk(catfish);
    for (let now = at + 50; now < at + SULK_MS; now += 50) {
      catfish.step(now, 0.05, false);
      expect(catfish.sim.sulk).toBe(true);
      expect(catfish.sim.surge).toBe(0);
    }
    catfish.step(at + SULK_MS + 50, 0.05, false);
    expect(catfish.sim.sulk).toBe(false);
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

  it("takes slack line out faster still when the inlet runs swollen", () => {
    const current = makeFight(fish("pike"), 6, 3, () => 0, 1, "current");
    const flood = makeFight(fish("pike"), 6, 3, () => 0, 1, "current", undefined, false, false, false, false, true);
    current.step(0, 0.05, false);
    flood.step(0, 0.05, false);
    current.step(50, 0.5, false);
    flood.step(50, 0.5, false);
    expect(flood.sim.line - 1).toBeCloseTo((current.sim.line - 1) * FLOOD_DRIFT);
  });

  it("swells the inlet with spring's melt or rain", () => {
    expect(floodedInlet("inlet", "spring", "clear")).toBe(true);
    expect(floodedInlet("inlet", "summer", "rain")).toBe(true);
    expect(floodedInlet("inlet", "summer", "clear")).toBe(false);
    expect(floodedInlet("reeds", "spring", "rain")).toBe(false);
  });

  it("gives the reeds weeds and the inlet a current", () => {
    expect(fightWater("reeds")).toBe("weeds");
    expect(fightWater("inlet")).toBe("current");
    expect(fightWater("dropoff")).toBe("deep");
    expect(fightWater("point")).toBe("rocks");
    expect(fightWater("dock")).toBe("pilings");
    expect(fightWater("shore")).toBe("open");
    expect(fightWater("open")).toBe("boat");
  });
});

describe("a run from the boat", () => {
  const runLine = (water: "open" | "boat") => {
    const f = makeFight(fish("pike"), 6, 3, () => 0, 1, water);
    let now = 0;
    while (f.sim.surge !== 2) f.step((now += 50), 0.05, false);
    const before = f.sim.line;
    f.step((now += 50), 0.2, false);
    return { run: f.sim.line - before };
  };

  it("takes out less line, since the boat swings to follow it", () => {
    expect(runLine("boat").run).toBeGreaterThan(0);
    expect(runLine("boat").run).toBeCloseTo(runLine("open").run * BOAT_RUN);
  });

  it("leaves line drifting between runs as it is from the bank", () => {
    const open = makeFight(fish("pike"), 6, 3, () => 0, 1, "open");
    const boat = makeFight(fish("pike"), 6, 3, () => 0, 1, "boat");
    open.step(0, 0.5, false);
    boat.step(0, 0.5, false);
    expect(boat.sim.line).toBeCloseTo(open.sim.line);
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
    expect(pullDeep.sim.diving).toBe(true);
    expect(pullOpen.sim.diving).toBe(false);
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
    expect(runtime.sim.rocky).toBe(water === "rocks" && steer === 0);
    return runtime.sim.tension - before;
  }

  it("loads the line harder on a run left unturned, and no harder on a turned one", () => {
    expect(runPull("rocks", 0)).toBeGreaterThan(runPull("open", 0));
    expect(runPull("rocks", 1)).toBeCloseTo(runPull("open", 1));
  });
});

describe("keeping a fish clear of the reeds' weeds and the point's rocks", () => {
  /** Plays two runs, turning them or not, reeling between and through them, and returns what the landed card would note. */
  function twoRuns(water: "weeds" | "rocks" | "pilings" | "open", turn: boolean) {
    const runtime = makeFight(fish("lake-whitefish"), 2, 3, () => 0, 1, water);
    let runs = 0;
    let was = runtime.sim.surge;
    for (let now = 0; now < 60_000 && runs < 2; now += 50) {
      const steer = turn && runtime.sim.surge === 2 ? (-runtime.sim.runSide as Steer) : 0;
      if (runtime.step(now, 0.05, runtime.sim.surge !== 1 && runtime.sim.tension < 0.6, steer) !== "fighting") break;
      if (was === 2 && runtime.sim.surge === 0) runs += 1;
      was = runtime.sim.surge;
    }
    expect(runs).toBe(2);
    return runtime.performance.clearOf;
  }

  it("notes runs turned clear of them, and not runs that went in", () => {
    expect(twoRuns("weeds", true)).toBe("weeds");
    expect(twoRuns("weeds", false)).toBeUndefined();
    expect(twoRuns("rocks", true)).toBe("rocks");
    expect(twoRuns("rocks", false)).toBeUndefined();
    expect(twoRuns("pilings", true)).toBe("pilings");
    expect(twoRuns("pilings", false)).toBeUndefined();
    expect(twoRuns("open", true)).toBeUndefined();
  });
});

describe("the dock's pilings", () => {
  /** Lets one run go unturned, then reels or rests through the calm after it. */
  function afterRun(water: "pilings" | "open", turn: boolean, reel: boolean) {
    const runtime = makeFight(fish("lake-whitefish"), 2, 3, () => 0, 1, water);
    let was = runtime.sim.surge;
    let now = 0;
    for (; now < 60_000; now += 50) {
      const steer = turn && runtime.sim.surge === 2 ? (-runtime.sim.runSide as Steer) : 0;
      runtime.step(now, 0.05, false, steer);
      if (was === 2 && runtime.sim.surge === 0) break;
      was = runtime.sim.surge;
    }
    const start = { line: runtime.sim.line, tension: runtime.sim.tension, wrapped: runtime.sim.wrapped === true };
    for (let t = 0; t < 10; t += 1) runtime.step((now += 50), 0.05, reel);
    return { start, line: runtime.sim.line, tension: runtime.sim.tension, runtime, now };
  }

  it("wraps the line round a piling after a run nobody turned, and not after a turned one", () => {
    expect(afterRun("pilings", false, false).start.wrapped).toBe(true);
    expect(afterRun("pilings", true, false).start.wrapped).toBe(false);
    expect(afterRun("open", false, false).start.wrapped).toBe(false);
  });

  it("wins no line while wrapped, and reeling against it loads the line", () => {
    const wrapped = afterRun("pilings", false, true);
    const open = afterRun("open", false, true);
    expect(wrapped.line).toBeCloseTo(wrapped.start.line);
    expect(open.line).toBeLessThan(open.start.line);
    expect(wrapped.tension - wrapped.start.tension).toBeCloseTo(open.tension - open.start.tension + WRAP_PULL * 0.5);
  });

  it("swings free once the wrap's time is up", () => {
    const { runtime, now } = afterRun("pilings", false, false);
    runtime.step(now + WRAP_MS, 0.05, false);
    expect(runtime.sim.wrapped).toBe(false);
  });
});

describe("a walleye's head shake", () => {
  /** Rests through the first run, then reels or rests through the calm after it; returns the shake's ticks and the calm's peak tension. */
  function calmAfterRun(id: string, reel: boolean) {
    const runtime = makeFight(fish(id), 3, 3, () => 0);
    let ran = false;
    let shakeTicks = 0;
    let peak = 0;
    for (let now = 0; now < 30_000; now += 20) {
      const calm = ran && runtime.sim.surge === 0;
      runtime.step(now, 0.02, calm && reel);
      if (runtime.sim.surge === 2) ran = true;
      else if (ran && runtime.sim.surge === 1) return { shakeTicks, peak, eased: runtime.performance.easedShakes ?? 0 };
      if (calm) {
        if (runtime.sim.shake) shakeTicks += 1;
        peak = Math.max(peak, runtime.sim.tension);
      }
    }
    throw new Error("never ran twice");
  }

  it("shakes its head once in the calm after a run, and other fish don't", () => {
    const { shakeTicks } = calmAfterRun("walleye", false);
    expect(shakeTicks * 20).toBeGreaterThanOrEqual(SHAKE_MS - 40);
    expect(shakeTicks * 20).toBeLessThanOrEqual(SHAKE_MS + 40);
    expect(calmAfterRun("pike", false).shakeTicks).toBe(0);
  });

  it("sends a line reeled through the shake into the red, after a moment's grace", () => {
    expect(calmAfterRun("walleye", true).peak).toBeGreaterThanOrEqual(RED_TENSION);
    expect(calmAfterRun("pike", true).peak).toBeLessThan(RED_TENSION);
    expect(SHAKE_GRACE_SEC).toBeGreaterThan(JUMP_GRACE_SEC);
  });

  it("counts a shake the angler eased off for, and not one reeled through", () => {
    expect(calmAfterRun("walleye", false).eased).toBe(1);
    expect(calmAfterRun("walleye", true).eased).toBe(0);
  });
});

describe("a brook trout's dart", () => {
  /** Plays the first run, steering against the side it started on or against wherever it is heading now; returns each tick's side. */
  function firstRun(id: string, steerBy: "start" | "now") {
    const runtime = makeFight(fish(id), 1.5, 3, () => 0);
    const sides: number[] = [];
    let start: -1 | 1 | null = null;
    let turnedLate = false;
    for (let now = 0; now < 30_000; now += 20) {
      if (runtime.sim.surge === 2 && start === null) start = runtime.sim.runSide;
      const side = steerBy === "start" ? start : runtime.sim.runSide;
      const steer = runtime.sim.surge === 2 && side !== null ? (-side as Steer) : 0;
      runtime.step(now, 0.02, false, steer);
      if (runtime.sim.surge === 2) {
        sides.push(runtime.sim.runSide);
        if (runtime.sim.darted && runtime.sim.turning) turnedLate = true;
      } else if (sides.length > 0) return { sides, turnedLate, followed: runtime.performance.followedDarts ?? 0 };
    }
    throw new Error("never ran");
  }

  it("cuts back the other way halfway through a run, and other fish run straight", () => {
    const { sides } = firstRun("brook-trout", "now");
    const flip = sides.findIndex((side) => side !== sides[0]);
    expect(flip).toBeGreaterThan(sides.length * 0.3);
    expect(flip).toBeLessThan(sides.length * 0.7);
    expect(sides.slice(flip).every((side) => side === sides[flip])).toBe(true);
    expect(new Set(firstRun("smallmouth-bass", "now").sides).size).toBe(1);
  });

  it("is only turned after the dart by an angler who switches sides", () => {
    expect(firstRun("brook-trout", "now").turnedLate).toBe(true);
    expect(firstRun("brook-trout", "start").turnedLate).toBe(false);
    expect(firstRun("brook-trout", "now").followed).toBe(1);
    expect(firstRun("brook-trout", "start").followed).toBe(0);
  });
});

describe("a largemouth bass in cover", () => {
  /** Lets the first run go unturned and returns when it ends. */
  function firstRunEnd(runtime: FightRuntime) {
    let was = runtime.sim.surge;
    for (let now = 0; now < 60_000; now += 50) {
      runtime.step(now, 0.05, false);
      if (was === 2 && runtime.sim.surge === 0) return now;
      was = runtime.sim.surge;
    }
    throw new Error("never ran");
  }

  it.each([
    ["weeds", "weeded", WEED_MS],
    ["pilings", "wrapped", WRAP_MS],
  ] as const)("stays buried in the %s longer than another fish, and doesn't run till it comes out", (water, flag, ms) => {
    const bass = makeFight(fish("largemouth-bass"), 4, 3, () => 0, 1, water);
    const at = firstRunEnd(bass);
    expect(bass.sim[flag]).toBe(true);
    for (let now = at + 50; now < at + ms * COVER_HOLD - 50; now += 50) {
      bass.step(now, 0.05, false);
      expect(bass.sim.surge).toBe(0);
    }
    expect(bass.sim[flag]).toBe(true);
    bass.step(at + ms * COVER_HOLD + 50, 0.05, false);
    expect(bass.sim[flag]).toBe(false);

    const smallmouth = makeFight(fish("smallmouth-bass"), 4, 3, () => 0, 1, water);
    const end = firstRunEnd(smallmouth);
    smallmouth.step(end + ms + 50, 0.05, false);
    expect(smallmouth.sim[flag]).toBe(false);
  });
});

describe("a run downstream at the inlet", () => {
  /** Lets the first run go, steering it or not, and returns how fast it took line and whether it ran with the current. */
  function firstRun(water: "current" | "open", firstSide: -1 | 1, turn: boolean) {
    // The first run's side comes from the weight: 2 lb heads right, 2.1 lb left.
    const runtime = makeFight(fish("lake-whitefish"), firstSide === 1 ? 2 : 2.1, 3, () => 0, 1, water);
    let start: number | null = null;
    let ticks = 0;
    let downstream = false;
    for (let now = 0; now < 60_000 && ticks < 10; now += 50) {
      // A turning angler leans against the run from its warning on.
      const steer = turn && runtime.sim.surge >= 1 ? (-runtime.sim.runSide as Steer) : 0;
      runtime.step(now, 0.05, false, steer);
      if (runtime.sim.downstream) downstream = true;
      if (runtime.sim.surge === 2) {
        start ??= runtime.sim.line;
        ticks += 1;
      }
    }
    // The line the run took in its first half second, before the spool's end can cut it short.
    return { taken: runtime.sim.line - start!, downstream, side: runtime.sim.runSide };
  }

  /** Plays three runs at the inlet, turning them or not, and returns what the landed card would note. */
  function threeRuns(firstSide: -1 | 1, turn: boolean) {
    const runtime = makeFight(fish("lake-whitefish"), firstSide === 1 ? 2 : 2.1, 3, () => 0, 1, "current");
    let runs = 0;
    let was = runtime.sim.surge;
    for (let now = 0; now < 60_000 && runs < 3; now += 50) {
      const steer = turn && runtime.sim.surge >= 1 ? (-runtime.sim.runSide as Steer) : 0;
      if (runtime.step(now, 0.05, runtime.sim.surge !== 1 && runtime.sim.tension < 0.6, steer) !== "fighting") break;
      if (was === 2 && runtime.sim.surge === 0) runs += 1;
      was = runtime.sim.surge;
    }
    expect(runs).toBe(3);
    return runtime.performance.clearOf;
  }

  it("notes a fish whose every run downstream was turned upstream, and not one let run with the current", () => {
    expect(threeRuns(DOWNSTREAM_SIDE, true)).toBe("current");
    expect(threeRuns(DOWNSTREAM_SIDE, false)).toBeUndefined();
    expect(threeRuns(-DOWNSTREAM_SIDE as -1 | 1, false)).toBeUndefined();
  });

  it("helps a run with the current take more line, and not one upstream, one turned or one on still water", () => {
    const down = firstRun("current", DOWNSTREAM_SIDE, false);
    expect(down.side).toBe(DOWNSTREAM_SIDE);
    expect(down.downstream).toBe(true);
    expect(firstRun("current", -DOWNSTREAM_SIDE as -1 | 1, false).downstream).toBe(false);
    expect(firstRun("current", DOWNSTREAM_SIDE, true).downstream).toBe(false);
    expect(firstRun("open", DOWNSTREAM_SIDE, false).downstream).toBe(false);
    expect(down.taken).toBeCloseTo(firstRun("current", -DOWNSTREAM_SIDE as -1 | 1, false).taken * DOWNSTREAM_RUN, 2);
  });
});

describe("the inlet's current on a resting fish", () => {
  it("carries a fish the angler isn't reeling, and not one being reeled or on open water", () => {
    const current = makeFight(fish("lake-whitefish"), 2, 3, () => 0, 1, "current");
    current.step(0, 0.05, false);
    expect(current.sim.carried).toBe(true);
    current.step(50, 0.05, true);
    expect(current.sim.carried).toBe(false);
    const open = makeFight(fish("lake-whitefish"), 2, 3, () => 0);
    open.step(0, 0.05, false);
    expect(open.sim.carried).toBe(false);
  });
});

describe("a windy day", () => {
  const calmDrift = (wind?: "breezy" | "strong") => {
    const f = makeFight(fish("pike"), 6, 3, () => 0, 1, "open", wind);
    f.step(0, 0.5, false);
    return f.sim.line - 1;
  };
  const runDrift = (wind?: "breezy" | "strong") => {
    const f = makeFight(fish("pike"), 6, 3, () => 0, 1, "open", wind);
    let now = 0;
    while (f.sim.surge !== 2) f.step((now += 50), 0.05, false);
    const before = f.sim.line;
    f.step((now += 50), 0.2, false);
    return f.sim.line - before;
  };

  it("bellies a slack line, so it drifts out faster between runs", () => {
    expect(calmDrift()).toBeGreaterThan(0);
    expect(calmDrift("breezy")).toBeCloseTo(calmDrift() * WIND_SLACK.breezy);
    expect(calmDrift("strong")).toBeCloseTo(calmDrift() * WIND_SLACK.strong);
  });

  it("leaves a run's pull as it is", () => {
    expect(runDrift("strong")).toBeCloseTo(runDrift());
  });

  it("only counts breezy and strong days", () => {
    expect(fightWind("strong")).toBe("strong");
    expect(fightWind("breezy")).toBe("breezy");
    expect(fightWind("light-west")).toBeUndefined();
    expect(fightWind("calm")).toBeUndefined();
    expect(fightWind(undefined)).toBeUndefined();
  });
});

describe("a pike rolling at the net", () => {
  const atTheNet = (id: string, weight: number) => {
    const runtime = makeFight(fish(id), weight, 5, () => 0);
    runtime.step(0, 0, false);
    runtime.sim.line = LAST_RUN_LINE - 0.01;
    runtime.step(100, 0, false);
    let now = 100;
    while (runtime.sim.surge !== 2) runtime.step((now += 50), 0.05, false);
    return { runtime, now };
  };

  it("rolls on the line instead of making a last run, for a short spell", () => {
    const { runtime, now } = atTheNet("pike", 3);
    expect(runtime.sim.roll).toBe(true);
    let t = now;
    while (runtime.sim.surge === 2) runtime.step((t += 50), 0.05, false);
    expect(t - now).toBeLessThanOrEqual(ROLL_MS + 50);
    expect(runtime.sim.roll).toBe(false);
  });

  it("loads a line held tight through the roll into the red, but not one eased off for it", () => {
    const held = atTheNet("pike", 3);
    let t = held.now;
    for (let i = 0; i < 10; i += 1) held.runtime.step((t += 50), 0.05, true);
    expect(held.runtime.performance.peakTension).toBeGreaterThanOrEqual(RED_TENSION);
    const eased = atTheNet("pike", 3);
    t = eased.now;
    for (let i = 0; i < 10; i += 1) eased.runtime.step((t += 50), 0.05, false);
    expect(eased.runtime.performance.peakTension).toBeLessThan(RED_TENSION);
    expect(JUMP_GRACE_SEC).toBeLessThan(0.5);
  });

  it("can't be turned", () => {
    const { runtime, now } = atTheNet("pike", 3);
    runtime.step(now + 50, 0.05, false, (-runtime.sim.runSide) as Steer);
    expect(runtime.sim.turning).toBe(false);
  });

  it("is a burbot's habit too: it coils on the line at the net", () => {
    const { runtime } = atTheNet("burbot", 3);
    expect(runtime.sim.roll).toBe(true);
  });

  it("is a pike's habit only: other fish still make a last run", () => {
    const { runtime } = atTheNet("walleye", 2);
    expect(runtime.sim.roll).toBeFalsy();
    expect(runtime.sim.lastRun).toBe(true);
  });
});

describe("a carp's first run", () => {
  /** Lets the line go through every run and returns how long each of the first three ran. */
  const runLengths = (id: string, trophy = false) => {
    const runtime = makeFight(fish(id), 6, 5, () => 0.5, 1, "open", undefined, false, false, false, trophy);
    const lengths: number[] = [];
    const flags: boolean[] = [];
    let started = -1;
    for (let now = 0; lengths.length < 3 && now < 120_000; now += 10) {
      const was = runtime.sim.surge;
      runtime.step(now, 0.01, false);
      if (was !== 2 && runtime.sim.surge === 2) {
        started = now;
        flags.push(runtime.sim.firstRun === true);
      }
      if (was === 2 && runtime.sim.surge !== 2) lengths.push(now - started);
    }
    return { lengths, flags };
  };

  it("is the long one, and only the first run is", () => {
    const { lengths, flags } = runLengths("carp");
    expect(flags).toEqual([true, false, false]);
    expect(lengths[0]! / lengths[1]!).toBeCloseTo(FIRST_RUN_LONGER, 1);
  });

  it("is a salmon's too, before its leaps", () => {
    expect(runLengths("salmon").flags).toEqual([true, false, false]);
  });

  it("is a carp's and a salmon's habit only", () => {
    const { flags } = runLengths("walleye");
    expect(flags.every((flag) => !flag)).toBe(true);
  });

  it("is any trophy-sized fish's too", () => {
    const { lengths, flags } = runLengths("walleye", true);
    expect(flags).toEqual([true, false, false]);
    expect(lengths[0]! / lengths[1]!).toBeCloseTo(FIRST_RUN_LONGER, 1);
  });
});

describe("a smallmouth bass, pound for pound", () => {
  /** Reels steadily between runs and lets every run go; returns the stamina left after ten seconds. */
  const staminaAfter = (id: string) => {
    const runtime = makeFight(fish(id), 2, 3, () => 0.5);
    for (let now = 0; now <= 10_000; now += 50) runtime.step(now, 0.05, runtime.sim.surge === 0 && runtime.sim.tension < 0.6);
    return runtime.sim.stamina;
  };

  it("tires slower than a largemouth of the same weight", () => {
    expect(SCRAPPERS.has("smallmouth-bass")).toBe(true);
    const small = 1 - staminaAfter("smallmouth-bass");
    const large = 1 - staminaAfter("largemouth-bass");
    expect(small).toBeLessThan(large);
    expect(small / large).toBeGreaterThanOrEqual(SCRAPPER_TIRE - 0.15);
  });
});

describe("a perch giving up", () => {
  /** Reels steadily between runs and lets every run go; returns the stamina spent after ten seconds. */
  const spent = (id: string) => {
    const runtime = makeFight(fish(id), 0.5, 3, () => 0.5);
    for (let now = 0; now <= 10_000; now += 50) runtime.step(now, 0.05, runtime.sim.surge === 0 && runtime.sim.tension < 0.6);
    return 1 - runtime.sim.stamina;
  };

  it("tires faster than a golden shiner of the same weight", () => {
    expect(QUITTERS.has("perch")).toBe(true);
    const perch = spent("perch");
    const shiner = spent("golden-shiner");
    expect(perch).toBeGreaterThan(shiner);
    expect(perch / shiner).toBeLessThanOrEqual(QUIT_TIRE + 0.15);
  });
});

describe("a bluegill turning broadside", () => {
  /** Reels the first calm for a second from the start and returns the line taken in. */
  const lineIn = (id: string) => {
    const runtime = makeFight(fish(id), 0.5, 3, () => 0.5);
    const start = runtime.sim.line;
    for (let now = 0; now <= 1000; now += 50) runtime.step(now, 0.05, true);
    return { gained: start - runtime.sim.line, fresh: runtime.sim.stamina >= 0.6 };
  };

  it("comes in slower than a perch while it's fresh", () => {
    expect(BROADSIDERS.has("bluegill")).toBe(true);
    const bluegill = lineIn("bluegill");
    const perch = lineIn("perch");
    expect(bluegill.fresh).toBe(true);
    expect(bluegill.gained).toBeLessThan(perch.gained);
    expect(bluegill.gained / perch.gained).toBeLessThan(BROADSIDE_REEL + 0.05);
  });
});

describe("a sturgeon's breach", () => {
  /** Lets the line go through the first three runs and notes which were leaps. */
  const leaps = (id: string) => {
    const runtime = makeFight(fish(id), 40, 10, () => 0.5);
    const flags: boolean[] = [];
    for (let now = 0; flags.length < 3 && now < 240_000; now += 10) {
      const was = runtime.sim.surge;
      runtime.step(now, 0.01, false);
      if (was !== 2 && runtime.sim.surge === 2) flags.push(runtime.sim.jump === true);
    }
    return flags;
  };

  it("makes only the first run a leap", () => {
    expect(BREACHERS.has("sturgeon")).toBe(true);
    expect(leaps("sturgeon")).toEqual([true, false, false]);
  });

  it("is a sturgeon's habit only", () => {
    expect(leaps("catfish").every((flag) => !flag)).toBe(true);
  });
});

describe("a whitefish's soft mouth", () => {
  /** Holds the reel down with the tension pinned in the red, between runs. */
  const reelInTheRed = (id: string, seconds: number) => {
    const runtime = makeFight(fish(id), 1.5, 5, () => 0.5);
    let outcome: FightOutcome = "fighting";
    let now = 0;
    for (; outcome === "fighting" && now < seconds * 1000; now += 50) {
      runtime.sim.surge = 0;
      runtime.sim.tension = Math.max(runtime.sim.tension, RED_TENSION + 0.05);
      outcome = runtime.step(now, 0.05, true);
    }
    return { runtime, outcome, now };
  };

  it("tears the hook out when it is reeled in the red", () => {
    const { runtime, outcome, now } = reelInTheRed("lake-whitefish", 3);
    expect(outcome).toBe("escaped");
    expect(runtime.sim.tornOut).toBe(true);
    expect(now).toBeGreaterThanOrEqual(TEAR_SEC * 1000);
    expect(now).toBeLessThanOrEqual(TEAR_SEC * 1000 + 100);
  });

  it("warns while the hook is tearing, and forgives a brief touch of red", () => {
    const runtime = makeFight(fish("lake-whitefish"), 1.5, 5, () => 0.5);
    runtime.sim.tension = RED_TENSION + 0.05;
    runtime.step(0, 0.05, true);
    expect(runtime.sim.tearing).toBe(true);
    runtime.sim.tension = 0.3;
    runtime.step(50, 0.05, false);
    expect(runtime.sim.tearing).toBe(false);
    runtime.sim.tension = RED_TENSION + 0.05;
    expect(runtime.step(100, 0.05, true)).toBe("fighting");
  });

  it("tears out of a crappie's paper mouth too", () => {
    const { runtime, outcome, now } = reelInTheRed("crappie", 3);
    expect(outcome).toBe("escaped");
    expect(runtime.sim.tornOut).toBe(true);
    expect(now).toBeLessThanOrEqual(PAPER_TEAR_SEC * 1000 + 100);
  });

  it("tears out of any fish hooked light", () => {
    const runtime = makeFight(fish("perch"), 0.4, 5, () => 0.5);
    runtime.sim.lightHook = true;
    let outcome: FightOutcome = "fighting";
    let now = 0;
    for (; outcome === "fighting" && now < 3000; now += 50) {
      runtime.sim.surge = 0;
      runtime.sim.tension = Math.max(runtime.sim.tension, RED_TENSION + 0.05);
      outcome = runtime.step(now, 0.05, true);
    }
    expect(outcome).toBe("escaped");
    expect(runtime.sim.tornOut).toBe(true);
    expect(now).toBeLessThanOrEqual(TEAR_SEC * 1000 + 100);
  });

  it("holds longer on a lure's treble hooks", () => {
    const runtime = makeFight(fish("lake-whitefish"), 1.5, 5, () => 0.5, 1, "open", undefined, false, true);
    let outcome: FightOutcome = "fighting";
    let now = 0;
    for (; outcome === "fighting" && now < 3000; now += 50) {
      runtime.sim.surge = 0;
      runtime.sim.tension = RED_TENSION + 0.05;
      outcome = runtime.step(now, 0.05, true);
    }
    expect(TREBLE_HOLD).toBeGreaterThan(1);
    expect(outcome).toBe("escaped");
    expect(now).toBeGreaterThan(TEAR_SEC * 1000 + 100);
    expect(now).toBeLessThanOrEqual(TEAR_SEC * TREBLE_HOLD * 1000 + 100);
  });

  it("is a whitefish's trait only", () => {
    const { runtime, outcome } = reelInTheRed("walleye", 3);
    expect(runtime.sim.tornOut).toBeFalsy();
    expect(outcome).not.toBe("escaped");
  });
});

describe("a fight in winter", () => {
  it("tires the fish faster in winter only", () => {
    expect(WINTER_TIRE).toBeGreaterThan(1);
    expect(seasonTireMul("winter")).toBe(WINTER_TIRE);
    expect(seasonTireMul("summer")).toBe(1);
    expect(seasonTireMul(undefined)).toBe(1);
  });

  it("keeps a cold lover lively in winter", () => {
    for (const id of COLD_LOVERS) {
      expect(thrivesInCold("winter", id)).toBe(true);
      expect(seasonTireMul("winter", id)).toBe(1);
    }
    expect(seasonTireMul("winter", "pike")).toBe(WINTER_TIRE);
    expect(thrivesInCold("summer", "burbot")).toBe(false);
  });

  it("slows a twilight hunter's tiring only at dawn and dusk", () => {
    expect(TWILIGHT_HUNTER_TIRE).toBeLessThan(1);
    for (const id of TWILIGHT_HUNTERS) {
      expect(twilightTireMul("dawn", id)).toBe(TWILIGHT_HUNTER_TIRE);
      expect(twilightTireMul("dusk", id)).toBe(TWILIGHT_HUNTER_TIRE);
      expect(twilightTireMul("day", id)).toBe(1);
    }
    expect(twilightTireMul("dusk", "pike")).toBe(1);
  });

  it("tires an early spawner faster only in spring", () => {
    expect(SPAWN_SPENT_TIRE).toBeGreaterThan(1);
    for (const id of EARLY_SPAWNERS) expect(spentTireMul("spring", id)).toBe(SPAWN_SPENT_TIRE);
    expect(spentTireMul("summer", "pike")).toBe(1);
    expect(spentTireMul("spring", "largemouth-bass")).toBe(1);
  });

  it("tires a cold-water fish faster only in summer's warm water", () => {
    expect(SUMMER_TIRE).toBeGreaterThan(1);
    for (const id of COLDWATER) expect(warmTireMul("summer", id)).toBe(SUMMER_TIRE);
    expect(warmTireMul("summer", "largemouth-bass")).toBe(1);
    expect(warmTireMul("winter", "brook-trout")).toBe(1);
    expect(warmTireMul(undefined, "salmon")).toBe(1);
  });

  it("spares a cold-water fish summer's short air when rain has cooled the water", () => {
    expect(rainCooled("summer", "brook-trout", "rain")).toBe(true);
    expect(warmTireMul("summer", "brook-trout", "rain")).toBe(1);
    expect(warmTireMul("summer", "brook-trout", "clear")).toBe(SUMMER_TIRE);
    expect(rainCooled("summer", "largemouth-bass", "rain")).toBe(false);
    expect(rainCooled("fall", "salmon", "rain")).toBe(false);
  });

  it("spares a cold-water fish summer's short air when it's hooked in the cool water off the dropoff", () => {
    expect(deepCooled("summer", "salmon", "dropoff")).toBe(true);
    expect(warmTireMul("summer", "salmon", "clear", "dropoff")).toBe(1);
    expect(warmTireMul("summer", "salmon", "clear", "dock")).toBe(SUMMER_TIRE);
    expect(deepCooled("summer", "largemouth-bass", "dropoff")).toBe(false);
    expect(deepCooled("winter", "salmon", "dropoff")).toBe(false);
  });

  it("slows a spring runner's tiring only at the inlet in spring", () => {
    expect(SPRING_RUN_TIRE).toBeLessThan(1);
    for (const id of SPRING_RUNNERS) expect(springRunTireMul("spring", id, "inlet")).toBe(SPRING_RUN_TIRE);
    expect(springRunTireMul("spring", "sturgeon", "dock")).toBe(1);
    expect(springRunTireMul("summer", "sturgeon", "inlet")).toBe(1);
    expect(springRunTireMul("spring", "pike", "inlet")).toBe(1);
  });

  it("slows a fall runner's tiring only in fall", () => {
    expect(FALL_RUN_TIRE).toBeLessThan(1);
    for (const id of FALL_RUNNERS) expect(runTireMul("fall", id)).toBe(FALL_RUN_TIRE);
    expect(runTireMul("summer", "salmon")).toBe(1);
    expect(runTireMul("fall", "pike")).toBe(1);
    expect(runTireMul(undefined, "salmon")).toBe(1);
  });

  it("slows a nest guarder's tiring only in spring by its nest", () => {
    expect(NEST_TIRE).toBeLessThan(1);
    for (const id of NEST_GUARDERS) {
      expect(nestTireMul("spring", id, "reeds")).toBe(NEST_TIRE);
      expect(nestTireMul("spring", id, "dock")).toBe(NEST_TIRE);
      expect(nestTireMul("spring", id, "dropoff")).toBe(1);
      expect(nestTireMul("summer", id, "reeds")).toBe(1);
    }
    expect(nestTireMul("spring", "pike", "reeds")).toBe(1);
  });

  it("slows a night hunter's tiring only at night", () => {
    expect(NIGHT_HUNTER_TIRE).toBeLessThan(1);
    for (const id of NIGHT_HUNTERS) {
      expect(nightTireMul("night", id)).toBe(NIGHT_HUNTER_TIRE);
      expect(nightTireMul("day", id)).toBe(1);
    }
    expect(nightTireMul("night", "pike")).toBe(1);
    expect(nightTireMul(undefined, "catfish")).toBe(1);
  });
});
