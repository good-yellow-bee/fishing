import {
  fieldGuide,
  guideProgress,
  isTrophyWeight,
  LAKE_HOUR_LABELS,
  lureClassesFor,
  peakSeason,
  SEASON_LABELS,
  shadowSize,
  SPOT_LABELS,
  trophyWeight,
  type CatchStat,
  type LakeHour,
  type GuideEntry,
  type ShadowSize,
  type SpotId,
} from "@stillwater/shared";
import { Link } from "react-router-dom";
import { bestHourFor, lureSizeFor, rarityLabel, type LureSize } from "../game/logic";
import { biteStyle, type BiteStyle } from "../game/nibblePlan";
import { fightsHardWhen, tiresSoonerWhen } from "../game/fishMoods";
import { t, useT } from "../i18n";
import { weightText } from "../i18n/content";
import { FishMark } from "./FishMark";
import { speciesLink } from "../field/speciesLink";

type Props = {
  stats: CatchStat[];
  /** How many fish of a kind the field log on this device holds, so a card can open that page. */
  inBook?: (name: string) => number;
};

function shadowLabel(size: ShadowSize): string {
  switch (size) {
    case "small":
      return t("Small shadow");
    case "medium":
      return t("Medium shadow");
    case "large":
      return t("Large shadow");
    case "huge":
      return t("Huge shadow");
  }
}

function lureLabel(size: LureSize): string {
  switch (size) {
    case "small":
      return t("small lure");
    case "large":
      return t("big lure");
    case "either":
      return t("any lure");
  }
}

/** How a kind of fish takes the bait, for the ones that don't simply nibble and dip. */
function biteLabel(style: BiteStyle): string | null {
  switch (style) {
    case "ambush":
      return t("Bites: hits from nowhere, with no nibble first");
    case "mouth":
      return t("Bites: mouths it a few times, and may come back for a second take");
    case "light":
      return t("Bites: so lightly the float only slides under");
    case "lift":
      return t("Bites: lifts the float and lays it flat");
    case "peck":
      return t("Bites: pecks in quick taps before it pulls");
    case "run":
      return t("Bites: runs off with it, sliding the float away");
    case "gulp":
      return t("Bites: gulps it down and holds on, so there's a moment longer to strike");
    case "snatch":
      return t("Bites: snatches it and lets go fast, so strike quick");
    case "roll":
      return t("Bites: rolls on it at the top in a big splash");
    case "usual":
      return null;
  }
}

const hourName = (hour: LakeHour) => t(LAKE_HOUR_LABELS[hour]).toLowerCase();

/** The lure classes that pull a species harder, with the hours they work, e.g. "Live bait (night), Spoon". */
function drawsOn(speciesId: string): string {
  return lureClassesFor(speciesId)
    .map(({ lure, hours }) => (hours && hours.length < 4 ? `${t(lure.label)} (${hours.map(hourName).join(", ")})` : t(lure.label)))
    .join(", ");
}

function GuideCard({ entry, inBook = 0 }: { entry: GuideEntry; inBook?: number }) {
  const { species } = entry;
  const known = entry.caught > 0;
  const hourAt = (spot: SpotId) => hourName(bestHourFor(species, spot));
  const trophyLanded = entry.heaviest !== null && isTrophyWeight(species, entry.heaviest);
  return (
    <article className={`guide-card ${known ? `rarity-${species.rarity}` : "unknown"}`}>
      <FishMark known={known} species={species} />
      {known ? <span className="rarity-tag">{rarityLabel(species.rarity)}</span> : <span className="rarity-tag">{t("unlogged")}</span>}
      {trophyLanded && <span className="rarity-tag guide-trophy">{t("Trophy")}</span>}
      <h3>{known ? t(species.name) : t("Unknown")}</h3>
      {known && (
        <>
          <p className="guide-lore">{t(species.lore)}</p>
          <p>
            {t("{caught} landed · PB {weight}", { caught: entry.caught, weight: weightText(entry.heaviest ?? 0) })}
          </p>
          <p>{t("Trophy ≥ {weight}", { weight: weightText(trophyWeight(species)) })}</p>
        </>
      )}
      <p>{shadowLabel(shadowSize(species))}</p>
      {known ? (
        species.spots.map((spot) => (
          <p key={spot}>
            {t("{spot}: {lure} at {hour}", { spot: t(SPOT_LABELS[spot]), lure: lureLabel(lureSizeFor(species, spot)), hour: hourAt(spot) })}
          </p>
        ))
      ) : (
        <p>{species.spots.map((spot) => t("{spot} at {hour}", { spot: t(SPOT_LABELS[spot]), hour: hourAt(spot) })).join(" · ")}</p>
      )}
      {known && drawsOn(species.id) && <p className="guide-draws">{t("Draws on: {lures}", { lures: drawsOn(species.id) })}</p>}
      {known && biteLabel(biteStyle(species.id)) && <p className="guide-bite">{biteLabel(biteStyle(species.id))}</p>}
      {known && fightsHardWhen(species.id).length > 0 && <p className="guide-mood">{t("Fights hard: {when}", { when: fightsHardWhen(species.id).join(", ") })}</p>}
      {known && tiresSoonerWhen(species.id).length > 0 && <p className="guide-mood">{t("Tires sooner: {when}", { when: tiresSoonerWhen(species.id).join(", ") })}</p>}
      {known && peakSeason(species.id) && <p className="guide-season">{t("Runs in {season}", { season: t(SEASON_LABELS[peakSeason(species.id)!]).toLowerCase() })}</p>}
      {known && inBook > 0 && (
        <p className="guide-book">
          <Link to={speciesLink(species.name)}>{t("In your field log: {count}", { count: inBook })}</Link>
        </p>
      )}
    </article>
  );
}

export function FieldGuide({ stats, inBook }: Props) {
  useT();
  const entries = fieldGuide(stats);
  const { found, total } = guideProgress(entries);
  return (
    <section className="field-guide">
      <div className="panel-heading">
        <span className="eyebrow">{t("Field guide")}</span>
        <h2>
          {t("{found} / {total} species", { found, total })}
        </h2>
      </div>
      <p className="guide-note">
        {t("Lure and time clues assume a cast released in the band.")} {t("Most fish tire sooner in winter's cold.")}
      </p>
      <div className="guide-grid">
        {entries.map((entry) => (
          <GuideCard key={entry.species.id} entry={entry} inBook={inBook?.(entry.species.name)} />
        ))}
      </div>
    </section>
  );
}
