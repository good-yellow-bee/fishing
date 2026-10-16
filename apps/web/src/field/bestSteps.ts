import { measureOf, type CatchEntry, type Measure } from "@stillwater/shared";

export type BestStep = { entry: CatchEntry; measure: Measure; gain: Measure | null };

function amount(measure: Measure): number {
  return measure.kind === "length" ? measure.inches : measure.pounds;
}

/**
 * How the best of a kind grew, oldest first: the first fish, then each that beat every one before it on the same
 * measure. Null for a measure with no fish that ever beat the first, where there is no story to tell.
 */
export function bestSteps(catches: readonly CatchEntry[], kind: Measure["kind"]): BestStep[] | null {
  const steps: BestStep[] = [];
  // A fish both measured and weighed counts on both lists.
  const oldestFirst = catches
    .flatMap((entry) => {
      const measure = measureOf(entry, kind);
      return measure ? [{ entry, measure }] : [];
    })
    .sort((a, b) => a.entry.caughtAt.localeCompare(b.entry.caughtAt));
  for (const { entry, measure } of oldestFirst) {
    const last = steps[steps.length - 1];
    if (!last) steps.push({ entry, measure, gain: null });
    else if (amount(measure) > amount(last.measure)) {
      const diff = amount(measure) - amount(last.measure);
      steps.push({ entry, measure, gain: kind === "length" ? { kind, inches: diff } : { kind, pounds: diff } });
    }
  }
  return steps.length > 1 ? steps : null;
}
