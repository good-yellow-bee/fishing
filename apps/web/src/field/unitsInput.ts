import type { Units } from "../i18n";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";

function parse(text: string) {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(value) ? null : value;
}

const round = (value: number, digits: number) => String(Math.round(value * 10 ** digits) / 10 ** digits);

/** "2,5" and ".5" as the book reads them ("2.5", "0.5"), so a phone with only a comma key is understood in any units. */
function decimal(text: string) {
  return text.trim().replace(",", ".").replace(/^\./, "0.");
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
/** "3 lb 4 oz", "3lb 4", "12 oz": pounds and ounces as a scale reads them. */
const POUNDS_OUNCES = new RegExp(String.raw`^(?:${NUM}\s*(?:lbs?|#)\s*)?(?:${NUM}\s*(?:oz)?)?$`, "i");
/** "18 1/4", "3/4", "18 1/4 in": inches as a tape is marked. */
const INCH_FRACTION = new RegExp(String.raw`^(?:(\d+)\s+)?(\d+)\s*/\s*(\d+)\s*(?:in|inch|inches|")?$`, "i");
/** A plain number with its unit written after it: "28 in", "3.2 lb", "71 cm", "1,4 kg". */
const WITH_UNIT = new RegExp(String.raw`^${NUM}\s*(in|inch|inches|"|lbs?|#|cm|kg)$`, "i");

const num = (text: string | undefined) => (text ? Number(text.replace(",", ".")) : 0);

/** Pounds and ounces or a fraction of an inch, as one imperial number; null for anything else. */
function imperialAmount(text: string, kind: "length" | "weight"): number | null {
  const clean = text.trim();
  if (kind === "weight") {
    const match = POUNDS_OUNCES.exec(clean);
    // A bare number is left to the plain reading; this is for text that names lb or oz.
    if (!match || !/lb|#|oz/i.test(clean) || (!match[1] && !match[2])) return null;
    // Ounces after pounds are the scale's: a whole number of pounds, and under 16 ounces.
    if (match[1] && match[2] && (/[.,]/.test(match[1]) || num(match[2]) >= 16)) return null;
    // "3 lb 4" means four ounces, as on the scale; "3.5 lb" stays pounds.
    return num(match[1]) + num(match[2]) / 16;
  }
  const match = INCH_FRACTION.exec(clean);
  if (!match || num(match[3]) === 0) return null;
  return num(match[1]) + num(match[2]) / num(match[3]);
}

/** What the player typed, in the book's inches or pounds; text that isn't a number passes through for the form to refuse. */
export function toBookAmount(text: string, kind: "length" | "weight", units: Units) {
  const clean = text.trim();
  // A unit written after the number wins over the units picked in Settings: "71 cm" is 71 cm either way.
  const unit = WITH_UNIT.exec(clean);
  if (unit) {
    const written = unit[2]!.toLowerCase();
    const isLength = written === "cm" || /^(in|inch|inches|")$/.test(written);
    // A weight's unit on a length, or the other way round, is left for the form to refuse.
    if (isLength !== (kind === "length")) return text;
    const value = num(unit[1]);
    if (written === "cm") return round(value / CM_PER_IN, 3);
    if (written === "kg") return round(value / KG_PER_LB, 3);
    return round(value, 3);
  }
  // Pounds and ounces in any units; a tape's fractions in inches, or with the inches written.
  if (units === "imperial" || /lb|#|oz|in|"/i.test(clean)) {
    const imperial = imperialAmount(clean, kind);
    if (imperial !== null) return round(imperial, 3);
  }
  const value = parse(text);
  if (value === null) return text;
  if (units === "imperial") return decimal(text);
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
  if (value === null) return text;
  if (units === "imperial") return decimal(text);
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
