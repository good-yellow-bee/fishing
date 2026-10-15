import type { CatchEntry, Measure } from "@stillwater/shared";

export type BestStep = { entry: CatchEntry; gain: Measure | null };

function amount(measure: Measure): number {
  return measure.kind === "length" ? measure.inches : measure.pounds;
}

/**
 * How the best of a kind grew, oldest first: the first fish, then each that beat every one before it on the same
 * measure. Null for a measure with no fish that ever beat the first, where there is no story to tell.
 */
export function bestSteps(catches: readonly CatchEntry[], kind: Measure["kind"]): BestStep[] | null {
  const steps: BestStep[] = [];
  const oldestFirst = catches.filter((entry) => entry.measure.kind === kind).sort((a, b) => a.caughtAt.localeCompare(b.caughtAt));
  for (const entry of oldestFirst) {
    const last = steps[steps.length - 1];
    if (!last) steps.push({ entry, gain: null });
    else if (amount(entry.measure) > amount(last.entry.measure)) {
      const diff = amount(entry.measure) - amount(last.entry.measure);
      steps.push({ entry, gain: kind === "length" ? { kind, inches: diff } : { kind, pounds: diff } });
    }
  }
  return steps.length > 1 ? steps : null;
}
