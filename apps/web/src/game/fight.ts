import type { ChallengeId, FishSpecies } from "@stillwater/shared";
import { difficulty01 } from "./logic";

export type SurgeState = 0 | 1 | 2; // 0 calm, 1 warning (telegraph), 2 surging
export type FightSim = { line: number; tension: number; surge: SurgeState };
export type FightOutcome = "fighting" | "landed" | "snapped" | "escaped";
export type FightRuntime = {
  sim: FightSim;
  performance: FightPerformance;
  step(nowMs: number, dtSec: number, reeling: boolean): FightOutcome;
};

export type FightPerformance = {
  peakTension: number;
  reachedEscapeLine: boolean;
};

export function isCleanFight(performance: FightPerformance) {
  return performance.peakTension <= 0.8 && !performance.reachedEscapeLine;
}

type Pattern = {
  calmMin: number;
  calmMax: number;
  surgeMin: number;
  surgeMax: number;
  warnMs: number;
  strength: number;
  reelSurge: number;
};

const PATTERNS: Record<ChallengeId, Pattern> = {
  mash: { calmMin: 700, calmMax: 1200, surgeMin: 400, surgeMax: 700, warnMs: 220, strength: 0.35, reelSurge: 0.75 },
  timing: { calmMin: 1500, calmMax: 2400, surgeMin: 700, surgeMax: 1000, warnMs: 480, strength: 0.62, reelSurge: 0.18 },
  tension: { calmMin: 1100, calmMax: 1800, surgeMin: 1600, surgeMax: 2400, warnMs: 380, strength: 0.48, reelSurge: 0.4 },
  sequence: { calmMin: 800, calmMax: 1300, surgeMin: 700, surgeMax: 1100, warnMs: 260, strength: 0.5, reelSurge: 0.32 },
  surge: { calmMin: 900, calmMax: 1400, surgeMin: 2000, surgeMax: 3200, warnMs: 350, strength: 0.52, reelSurge: 0.28 },
};

export const FIGHT_LINES: Record<ChallengeId, [string, string, string]> = {
  mash: ["Keep pumping", "It's shaking…", "SHAKE — ease a hair"],
  timing: ["Steady retrieve", "It's lining up…", "RUN — let it go"],
  tension: ["Grind it in", "The rod loads…", "BULLDOG — ease off"],
  sequence: ["Short pumps", "Another burst…", "DOUBLE RUN — ease"],
  surge: ["Don't horse it", "It's gathering…", "LONG RUN — ease off"],
};

export function makeFight(
  species: FishSpecies,
  weight: number,
  strength: number,
  random: () => number = Math.random,
): FightRuntime {
  const pattern = PATTERNS[species.challenge];
  const t = difficulty01(species, weight);
  const reelRate = Math.max(0.07, 0.14 + strength * 0.005 - t * 0.02);
  const driftCalm = 0.012 + t * 0.015;
  const driftSurge = driftCalm * (species.challenge === "tension" ? 1.35 : 2);
  const tensionUpCalm = Math.max(
    0.12,
    0.2 + t * 0.12 - (strength - 1) * 0.015 + (species.challenge === "tension" ? 0.08 : 0),
  );
  const tensionDecay = species.challenge === "mash" ? 0.7 : 0.85;
  const surgeScale = 0.55 + t * 0.35;
  const range = (min: number, max: number) => min + random() * (max - min);

  const sim: FightSim = { line: 1, tension: 0.2, surge: 0 };
  const performance: FightPerformance = { peakTension: sim.tension, reachedEscapeLine: false };
  let completedSurges = 0;
  let nextAt: number | null = null;

  const step = (nowMs: number, dtSec: number, reeling: boolean): FightOutcome => {
    if (nextAt === null) nextAt = nowMs + range(1200, 1800);
    if (nowMs >= nextAt) {
      if (sim.surge === 0) {
        sim.surge = 1;
        nextAt = nowMs + pattern.warnMs;
      } else if (sim.surge === 1) {
        sim.surge = 2;
        nextAt = nowMs + range(pattern.surgeMin, pattern.surgeMax);
      } else {
        sim.surge = 0;
        completedSurges += 1;
        const double = species.challenge === "sequence" && completedSurges % 2 === 1;
        nextAt = nowMs + (double ? range(160, 280) : range(pattern.calmMin, pattern.calmMax));
      }
    }

    const escalation = species.challenge === "surge" ? Math.min(0.25, completedSurges * 0.05) : 0;
    const eff = pattern.strength * surgeScale + escalation;
    if (reeling) {
      sim.tension += (tensionUpCalm + (sim.surge === 2 ? eff : 0)) * dtSec;
      sim.line -= reelRate * (sim.surge === 2 ? pattern.reelSurge : 1) * dtSec;
    } else {
      sim.tension = Math.max(0, sim.tension - tensionDecay * dtSec);
      sim.line += (sim.surge === 2 ? driftSurge : driftCalm) * dtSec;
    }
    sim.line = Math.min(1.3, Math.max(0, sim.line));
    performance.peakTension = Math.max(performance.peakTension, sim.tension);
    performance.reachedEscapeLine ||= sim.line >= 1.25;

    if (sim.line <= 0) return "landed";
    if (sim.tension >= 1) return "snapped";
    if (sim.line >= 1.25) return "escaped";
    return "fighting";
  };

  return { sim, performance, step };
}
