import {
  fishById,
  canLand,
  FISH,
  MAX_SKILL,
  SKILL_LABELS,
  SKY_LABELS,
  SPOT_LABELS,
  WIND_LABELS,
  type CatchWeather,
  type DailyRequest,
  type FieldLogBestBeat,
  type Measure,
  type Profile,
  type SkillId,
} from "@stillwater/shared";
import { num, t } from ".";

/**
 * Lines the shared package builds in English, rebuilt here in the player's
 * language. Plain labels (fish names, lore, spot and sky names) go through
 * `t()` directly; these cover the sentences with parts in them.
 */

/** "2.4 lb" / "2,4 lb". Units stay as the lake measures them. */
export function measureText(measure: Measure): string {
  const amount = measure.kind === "length" ? measure.inches : measure.pounds;
  return `${num(amount)} ${measure.kind === "length" ? "in" : "lb"}`;
}

/** "Clear · Calm · 61°F" in the player's words. */
export function weatherText(weather: CatchWeather): string {
  return `${t(SKY_LABELS[weather.sky])} · ${t(WIND_LABELS[weather.wind])} · ${num(weather.waterTempF)}°F`;
}

/** "A yellow perch over 1 lb at the Dock" / "3 × bluegill". */
export function dailyRequestText(request: DailyRequest): string {
  const name = t(fishById(request.speciesId)!.name);
  const fish = request.count === 1 ? t("A {fish}", { fish: name.toLowerCase() }) : `${request.count} × ${name.toLowerCase()}`;
  const size = request.minWeight === undefined ? "" : t(" over {weight} lb", { weight: num(request.minWeight) });
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
