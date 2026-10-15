import type { Units } from "../i18n";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";

function parse(text: string) {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(value) ? null : value;
}

const round = (value: number, digits: number) => String(Math.round(value * 10 ** digits) / 10 ** digits);

/** What the player typed, in the book's inches or pounds; text that isn't a number passes through for the form to refuse. */
export function toBookAmount(text: string, kind: "length" | "weight", units: Units) {
  const value = parse(text);
  if (units === "imperial" || value === null) return text;
  return round(kind === "length" ? value / CM_PER_IN : value / KG_PER_LB, 3);
}

/** A stored amount as the player reads it, for editing. */
export function fromBookAmount(value: number, kind: "length" | "weight", units: Units) {
  if (units === "imperial") return String(value);
  return round(kind === "length" ? value * CM_PER_IN : value * KG_PER_LB, kind === "length" ? 1 : 2);
}

/** A typed water temperature in the book's °F. */
export function toBookTemp(text: string, units: Units) {
  const value = parse(text);
  if (units === "imperial" || value === null) return text;
  return round((value * 9) / 5 + 32, 1);
}

/** A stored °F as the player reads it, for editing. */
export function fromBookTemp(fahrenheit: number, units: Units) {
  return units === "imperial" ? String(fahrenheit) : round(((fahrenheit - 32) * 5) / 9, 1);
}

/** The book's range messages name imperial bounds; a metric reader gets the same bounds in their units. */
const METRIC_MESSAGES: Record<string, string> = {
  "Length should sit between 1 and 120 inches.": "Length should sit between 3 and 304 centimetres.",
  "Weight should sit between 0.1 and 80 pounds.": "Weight should sit between 0.05 and 36 kilograms.",
  "Water temperature should sit between 32 and 90.": "Water temperature should sit between 0 and 32 °C.",
};

export function unitsMessage(message: string, units: Units) {
  return units === "metric" ? (METRIC_MESSAGES[message] ?? message) : message;
}
