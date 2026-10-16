import { measureOf, type CatchEntry, type Measure } from "@stillwater/shared";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";
import { parseSizeQuery, sizeMatches } from "./sizeQuery";

export type SizeBand = { from: number; to: number; unit: string; count: number; search: string };

/** Round band widths to try, smallest first, in the unit the reader sees. */
const STEPS: Record<string, number[]> = {
  in: [1, 2, 5, 10],
  cm: [2, 5, 10, 20, 50],
  lb: [0.25, 0.5, 1, 2, 5, 10],
  kg: [0.1, 0.25, 0.5, 1, 2, 5],
};

/** At most this many bands, so the bars read at a glance. */
const MOST_BANDS = 6;

/** Below this many fish measured one way, a spread says little. */
export const BANDS_FROM = 4;

/** A bound as the search reads it: "0.5", "12", never "0.30000000000000004". */
function bound(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * How a kind's fish spread over round bands of one measure, in the reader's units, smallest first. Each band holds
 * fish from its lower edge up to (not including) its upper one, and is counted through the same size search its row
 * opens, so the count and the matches agree. Empty when too few fish were measured that way or they all share a band.
 */
export function sizeBands(catches: readonly CatchEntry[], kind: Measure["kind"], metric: boolean): SizeBand[] {
  const measures = catches.map((entry) => measureOf(entry, kind)).filter((measure): measure is Measure => measure !== null);
  if (measures.length < BANDS_FROM) return [];
  const unit = kind === "length" ? (metric ? "cm" : "in") : metric ? "kg" : "lb";
  const shown = measures.map((measure) =>
    measure.kind === "length" ? measure.inches * (metric ? CM_PER_IN : 1) : measure.pounds * (metric ? KG_PER_LB : 1),
  );
  const low = Math.min(...shown);
  const high = Math.max(...shown);
  const steps = STEPS[unit]!;
  const step = steps.find((size) => Math.floor(high / size) - Math.floor(low / size) + 1 <= MOST_BANDS) ?? steps[steps.length - 1]!;
  const bands: SizeBand[] = [];
  for (let from = Math.floor(low / step) * step; from <= high + 1e-9; from += step) {
    const to = from + step;
    const search = `>${bound(from)} ${unit} + <${bound(to)} ${unit}`;
    const over = parseSizeQuery(`>${bound(from)} ${unit}`)!;
    const under = parseSizeQuery(`<${bound(to)} ${unit}`)!;
    const count = measures.filter((measure) => sizeMatches(measure, over) && sizeMatches(measure, under)).length;
    bands.push({ from: Number(bound(from)), to: Number(bound(to)), unit, count, search });
  }
  return bands.filter((band) => band.count > 0).length > 1 ? bands : [];
}
