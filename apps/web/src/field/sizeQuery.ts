import type { Measure } from "@stillwater/shared";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";
import { imperialAmount } from "./unitsInput";

const UNITS: Record<string, { kind: Measure["kind"]; toBase: number }> = {
  lb: { kind: "weight", toBase: 1 },
  lbs: { kind: "weight", toBase: 1 },
  oz: { kind: "weight", toBase: 1 / 16 },
  kg: { kind: "weight", toBase: 1 / KG_PER_LB },
  g: { kind: "weight", toBase: 1 / (1000 * KG_PER_LB) },
  in: { kind: "length", toBase: 1 },
  cm: { kind: "length", toBase: 1 / CM_PER_IN },
};

export type SizeQuery = { kind: Measure["kind"]; over: boolean; amount: number; orEqual?: boolean };

/** ">2 lb", "< 30 cm", ">=1,5 kg", "<=20 in": a size bound in pounds or inches, or null when the text isn't one. */
export function parseSizeQuery(text: string): SizeQuery | null {
  const query = readSizeQuery(text);
  // "<=" takes the bound itself too; a plain "<" stops short of it, as the water-temperature bounds do.
  return query && !query.over && text.includes("<=") ? { ...query, orEqual: true } : query;
}

function readSizeQuery(text: string): SizeQuery | null {
  const found = /^([<>])=?\s*(\d+(?:[.,]\d+)?)\s*([a-z]+)$/i.exec(text.trim());
  if (!found) {
    // ">3 lb 2 oz", "<18 1/4 in": a bound as the scale or the tape reads it, the same way the catch form takes it.
    const bound = /^([<>])=?\s*(.+)$/.exec(text.trim());
    if (!bound) return null;
    const pounds = imperialAmount(bound[2]!, "weight");
    if (pounds !== null) return { kind: "weight", over: bound[1] === ">", amount: pounds };
    const inches = imperialAmount(bound[2]!, "length");
    return inches === null ? null : { kind: "length", over: bound[1] === ">", amount: inches };
  }
  const unit = UNITS[found[3]!.toLowerCase()];
  if (!unit) return null;
  return { kind: unit.kind, over: found[1] === ">", amount: Number(found[2]!.replace(",", ".")) * unit.toBase };
}

/** Metric sizes are kept to three places in inches or pounds, so a fish logged right on a bound may sit a hair off it. */
const SIZE_SLACK = 0.0005;

/**
 * True when the fish was measured the same way and lands on the asked side of the bound: from it up for ">", below it
 * for "<" (or up to it for "<="), so the size bands on a species page open the same fish they count.
 */
export function sizeMatches(measure: Measure, query: SizeQuery): boolean {
  if (measure.kind !== query.kind) return false;
  const amount = measure.kind === "length" ? measure.inches : measure.pounds;
  if (query.over) return amount >= query.amount - SIZE_SLACK;
  return query.orEqual ? amount <= query.amount + SIZE_SLACK : amount < query.amount - SIZE_SLACK;
}

export type TempQuery = { over: boolean; fahrenheit: number; orEqual?: boolean };

/** ">60°F", "<15 °C", ">= 58 f": a water-temperature bound in °F, or null when the text isn't one. */
export function parseTempQuery(text: string): TempQuery | null {
  const found = /^([<>])=?\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*([cf])$/i.exec(text.trim());
  if (!found) return null;
  const value = Number(found[2]!.replace(",", "."));
  const fahrenheit = found[3]!.toLowerCase() === "c" ? (value * 9) / 5 + 32 : value;
  return found[0]!.includes("<=") ? { over: false, fahrenheit, orEqual: true } : { over: found[1] === ">", fahrenheit };
}

/** Temperatures are kept to a tenth of a °F, so one logged in °C right on a bound may sit a hair off it. */
const TEMP_SLACK = 0.05;

/**
 * True when the fish's water lands on the asked side of the bound: from it up for ">", below it for "<" (or up to it
 * for "<="), so the temperature bands on Bests (50 up to 60, and so on) open the same fish they count.
 */
export function tempMatches(waterTempF: number | undefined, query: TempQuery): boolean {
  if (waterTempF === undefined || !Number.isFinite(waterTempF)) return false;
  if (query.over) return waterTempF >= query.fahrenheit - TEMP_SLACK;
  return query.orEqual ? waterTempF <= query.fahrenheit + TEMP_SLACK : waterTempF < query.fahrenheit - TEMP_SLACK;
}
