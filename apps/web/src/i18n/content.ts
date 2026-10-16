import {
  fishById,
  canLand,
  FISH,
  MAX_SKILL,
  SKILL_LABELS,
  SKY_LABELS,
  SPOT_LABELS,
  WIND_LABELS,
  measuresOf,
  type CatchEntry,
  type CatchWeather,
  type DailyRequest,
  type FieldLogBestBeat,
  type Measure,
  type Profile,
  type SkillId,
} from "@stillwater/shared";
import { getUnits, num, t } from ".";

/**
 * Lines the shared package builds in English, rebuilt here in the player's
 * language. Plain labels (fish names, lore, spot and sky names) go through
 * `t()` directly; these cover the sentences with parts in them.
 */

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

/** "2.4 lb", or "1,1 kg" for a metric reader. The book keeps pounds. */
export function weightText(pounds: number): string {
  return getUnits() === "metric" ? `${num(pounds * KG_PER_LB, pounds * KG_PER_LB < 1 ? 2 : 1)} kg` : `${num(pounds)} lb`;
}

/** "28 in", or "71 cm" for a metric reader. The book keeps inches. */
export function lengthText(inches: number): string {
  return getUnits() === "metric" ? `${num(inches * CM_PER_IN, 0)} cm` : `${num(inches)} in`;
}

/** "61°F", or "16°C" for a metric reader. The book keeps °F. */
export function tempText(fahrenheit: number): string {
  return getUnits() === "metric" ? `${num(((fahrenheit - 32) * 5) / 9, 0)}°C` : `${num(fahrenheit)}°F`;
}

/** "2.4 lb" / "2,4 lb" / "1,1 kg". */
export function measureText(measure: Measure): string {
  return measure.kind === "length" ? lengthText(measure.inches) : weightText(measure.pounds);
}

/** "28 in · 6.4 lb" for a fish both measured and weighed, else its one measure. */
export function measuresText(entry: CatchEntry): string {
  return measuresOf(entry).map(measureText).join(" · ");
}

/** "Clear · Calm · 61°F" in the player's words and units. */
export function weatherText(weather: CatchWeather): string {
  return `${t(SKY_LABELS[weather.sky])} · ${t(WIND_LABELS[weather.wind])} · ${tempText(weather.waterTempF)}`;
}

/** "A yellow perch over 1 lb at the Dock" / "3 × bluegill". */
export function dailyRequestText(request: DailyRequest): string {
  const name = t(fishById(request.speciesId)!.name);
  const fish = request.count === 1 ? t("A {fish}", { fish: name.toLowerCase() }) : `${request.count} × ${name.toLowerCase()}`;
  const size = request.minWeight === undefined ? "" : t(" over {weight}", { weight: weightText(request.minWeight) });
  const bank = request.spot ? t(" at the {spot}", { spot: t(SPOT_LABELS[request.spot]) }) : "";
  return `${fish}${size}${bank}`;
}

/** The nearest skill rank that opens new species, e.g. "Strength 3: Common carp, Channel catfish". */
export function skillUnlockText(profile: Pick<Profile, SkillId>, skill: SkillId): string | null {
  for (let rank = profile[skill] + 1; rank <= MAX_SKILL; rank++) {
    const raised = { ...profile, [skill]: rank };
    const opened = FISH.filter((fish) => !canLand(profile, fish) && canLand(raised, fish));
    if (opened.length > 0) return `${t(SKILL_LABELS[skill])} ${rank}: ${opened.map((fish) => t(fish.name)).join(", ")}`;
  }
  return null;
}

/** "Beats your 2.1 lb Walleye already in the field log". */
export function bestBeatText(beat: FieldLogBestBeat): string {
  const vars = { size: measureText({ kind: "weight", pounds: beat.previousPounds }), species: t(beat.previousSpecies) };
  return beat.scope === "book"
    ? t("Beats the {size} {species} already in the field log", vars)
    : t("Beats your {size} {species} already in the field log", vars);
}
