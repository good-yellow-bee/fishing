/** The tiers an angler climbs with each kind of fish, by how many of it they have landed. */
export const MASTERY_TIERS = [
  { id: "known", label: "Known", from: 5 },
  { id: "skilled", label: "Skilled", from: 15 },
  { id: "master", label: "Master", from: 40 },
] as const;

export type MasteryTier = (typeof MASTERY_TIERS)[number];

/** A kind the angler has mastered pays this much more for every fish of it after. */
export const MASTER_BONUS = 1.1;

/** The highest tier `caught` fish of a kind reach, or null below the first. */
export function masteryTier(caught: number): MasteryTier | null {
  return [...MASTERY_TIERS].reverse().find((tier) => caught >= tier.from) ?? null;
}

/** The next tier up and how many more fish it takes; null once mastered. */
export function nextMastery(caught: number): { tier: MasteryTier; toGo: number } | null {
  const tier = MASTERY_TIERS.find((one) => caught < one.from);
  return tier ? { tier, toGo: tier.from - caught } : null;
}

/** The tier the next fish of a kind reaches, when it is the one that crosses into it; `prior` is how many were landed before. */
export function tierReachedBy(prior: number): MasteryTier | null {
  return MASTERY_TIERS.find((tier) => tier.from === prior + 1) ?? null;
}

/** The points for a fish of a kind already mastered before it: MASTER_BONUS, else 1. */
export function masteryBonus(prior: number): number {
  return prior >= MASTERY_TIERS[MASTERY_TIERS.length - 1].from ? MASTER_BONUS : 1;
}
