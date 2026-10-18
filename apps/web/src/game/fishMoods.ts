import { COLD_LOVERS, COLDWATER, CURRENT_FIGHTERS, EARLY_SPAWNERS, FALL_FEEDERS, FALL_RUNNERS, NEST_GUARDERS, NIGHT_HUNTERS, SCENT_HUNTERS, SPRING_RUNNERS, TWILIGHT_HUNTERS, WARM_LOVERS } from "./fight";
import { t } from "../i18n";

/** When a kind of fish fights hard (tires slower than others would), from its season, hour, sky and spot habits, for the field guide. */
export function fightsHardWhen(speciesId: string): string[] {
  const when: string[] = [];
  if (COLD_LOVERS.has(speciesId)) when.push(t("in winter's cold"));
  if (SPRING_RUNNERS.has(speciesId)) when.push(t("on its spring run up the Inlet"));
  if (NEST_GUARDERS.has(speciesId)) when.push(t("guarding its nest at the Reeds or the Dock in spring"));
  if (WARM_LOVERS.has(speciesId)) when.push(t("in summer's warm water"));
  if (FALL_RUNNERS.has(speciesId) || FALL_FEEDERS.has(speciesId)) when.push(t("in fall"));
  if (CURRENT_FIGHTERS.has(speciesId)) when.push(t("in the Inlet's current"));
  if (TWILIGHT_HUNTERS.has(speciesId)) when.push(t("at dawn and dusk"));
  if (NIGHT_HUNTERS.has(speciesId)) when.push(t("after dark"));
  if (SCENT_HUNTERS.has(speciesId)) when.push(t("in rain"));
  return when;
}

/** When a kind of fish tires sooner than usual, beyond the winter cold that slows most fish. */
export function tiresSoonerWhen(speciesId: string): string[] {
  const when: string[] = [];
  if (EARLY_SPAWNERS.has(speciesId)) when.push(t("in spring, after spawning"));
  if (COLDWATER.has(speciesId)) when.push(t("in summer, unless rain or the Drop-off cools the water"));
  return when;
}
