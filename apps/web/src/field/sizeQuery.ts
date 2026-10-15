import type { Measure } from "@stillwater/shared";

const UNITS: Record<string, { kind: Measure["kind"]; toBase: number }> = {
  lb: { kind: "weight", toBase: 1 },
  lbs: { kind: "weight", toBase: 1 },
  oz: { kind: "weight", toBase: 1 / 16 },
  kg: { kind: "weight", toBase: 2.20462 },
  g: { kind: "weight", toBase: 0.00220462 },
  in: { kind: "length", toBase: 1 },
  cm: { kind: "length", toBase: 1 / 2.54 },
};

export type SizeQuery = { kind: Measure["kind"]; over: boolean; amount: number };

/** ">2 lb", "< 30 cm", ">=1,5 kg": a size bound in pounds or inches, or null when the text isn't one. */
export function parseSizeQuery(text: string): SizeQuery | null {
  const found = /^([<>])=?\s*(\d+(?:[.,]\d+)?)\s*([a-z]+)$/i.exec(text.trim());
  if (!found) return null;
  const unit = UNITS[found[3]!.toLowerCase()];
  if (!unit) return null;
  return { kind: unit.kind, over: found[1] === ">", amount: Number(found[2]!.replace(",", ".")) * unit.toBase };
}

/** True when the fish was measured the same way and lands on the asked side of the bound. */
export function sizeMatches(measure: Measure, query: SizeQuery): boolean {
  if (measure.kind !== query.kind) return false;
  const amount = measure.kind === "length" ? measure.inches : measure.pounds;
  return query.over ? amount >= query.amount : amount <= query.amount;
}
