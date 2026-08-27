import type { FishSpecies } from "@stillwater/shared";
import { difficulty01 } from "./logic";

export type SurgeState = 0 | 1 | 2; // 0 calm, 1 warning (telegraph), 2 surging
export type FightSim = { line: number; tension: number; surge: SurgeState };
export type FightOutcome = "fighting" | "landed" | "snapped" | "escaped";
export type FightRuntime = {
  sim: FightSim;
  step(nowMs: number, dtSec: number, reeling: boolean): FightOutcome;
};

type Pattern = {
  calmMin: number;
  calmMax: number;
  surgeMin: number;
  surgeMax: number;
  warnMs: number;
  strength: number;
};

const PATTERNS: Record<FishSpecies["challenge"], Pattern> = {
  mash: { calmMin: 900, calmMax: 1600, surgeMin: 500, surgeMax: 800, warnMs: 250, strength: 0.4 },
  timing: { calmMin: 1500, calmMax: 2400, surgeMin: 700, surgeMax: 1000, warnMs: 450, strength: 0.55 },
  tension: { calmMin: 1200, calmMax: 2000, surgeMin: 1400, surgeMax: 2100, warnMs: 350, strength: 0.5 },
  sequence: { calmMin: 700, calmMax: 1100, surgeMin: 900, surgeMax: 1300, warnMs: 300, strength: 0.5 },
  surge: { calmMin: 900, calmMax: 1400, surgeMin: 2000, surgeMax: 3200, warnMs: 350, strength: 0.5 },
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
  const driftSurge = driftCalm * 2;
  const tensionUpCalm = Math.max(0.12, 0.2 + t * 0.12 - (strength - 1) * 0.015);
  const tensionDecay = 0.85;
  const surgeScale = 0.55 + t * 0.35;
  const range = (min: number, max: number) => min + random() * (max - min);

  const sim: FightSim = { line: 1, tension: 0.2, surge: 0 };
  let completedSurges = 0;
  // Scheduled lazily off the first step's clock so the sim never reads wall time itself.
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
        nextAt = nowMs + range(pattern.calmMin, pattern.calmMax);
      }
    }

    const escalation = species.challenge === "surge" ? Math.min(0.25, completedSurges * 0.05) : 0;
    const eff = pattern.strength * surgeScale + escalation;
    if (reeling) {
      sim.tension += (tensionUpCalm + (sim.surge === 2 ? eff : 0)) * dtSec;
      sim.line -= reelRate * (sim.surge === 2 ? 0.35 : 1) * dtSec;
    } else {
      sim.tension = Math.max(0, sim.tension - tensionDecay * dtSec);
      sim.line += (sim.surge === 2 ? driftSurge : driftCalm) * dtSec;
    }
    sim.line = Math.min(1.3, Math.max(0, sim.line));

    if (sim.line <= 0) return "landed";
    if (sim.tension >= 1) return "snapped";
    if (sim.line >= 1.25) return "escaped";
    return "fighting";
  };

  return { sim, step };
}
