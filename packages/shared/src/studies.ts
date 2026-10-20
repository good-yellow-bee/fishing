import { fishById } from "./fish.ts";
import { isTrophyWeight } from "./guide.ts";
import type { LakeHour } from "./hour.ts";
import type { SpotId } from "./types.ts";

/** A kind's studies pay this many points once, when all three are done. */
export const STUDY_REWARD = 100;
/** The hours study asks for a kind landed at this many of the lake's four hours. */
export const STUDY_HOURS = 3;

/** One kind's landed fish, as far as the studies read them: each bank and hour it came at, and the heaviest. */
export type StudyFact = { speciesId: string; spot: SpotId; hour: LakeHour | null; heaviest: number };

/** Where an angler stands with a kind's three studies: every bank it lives at, three of the lake's hours, a trophy. */
export type StudyProgress = { speciesId: string; banks: { have: number; need: number }; hours: { have: number; need: number }; trophy: boolean; done: boolean };

/** Each landed kind's studies from its facts. */
export function studyProgress(facts: readonly StudyFact[]): StudyProgress[] {
  const byKind = new Map<string, StudyFact[]>();
  for (const fact of facts) byKind.set(fact.speciesId, [...(byKind.get(fact.speciesId) ?? []), fact]);
  const out: StudyProgress[] = [];
  for (const [speciesId, rows] of byKind) {
    const species = fishById(speciesId);
    if (!species) continue;
    const banks = { have: species.spots.filter((spot) => rows.some((row) => row.spot === spot)).length, need: species.spots.length };
    const hours = { have: Math.min(STUDY_HOURS, new Set(rows.flatMap((row) => (row.hour ? [row.hour] : []))).size), need: STUDY_HOURS };
    const trophy = rows.some((row) => isTrophyWeight(species, row.heaviest));
    out.push({ speciesId, banks, hours, trophy, done: banks.have >= banks.need && hours.have >= hours.need && trophy });
  }
  return out;
}
