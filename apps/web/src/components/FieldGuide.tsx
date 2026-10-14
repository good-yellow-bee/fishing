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
import { bestHourFor, lureSizeFor, oneDecimal, rarityLabel, type LureSize } from "../game/logic";
import { t, useT } from "../i18n";
import { FishMark } from "./FishMark";

type Props = {
  stats: CatchStat[];
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

const hourName = (hour: LakeHour) => t(LAKE_HOUR_LABELS[hour]).toLowerCase();

/** The lure classes that pull a species harder, with the hours they work, e.g. "Live bait (night), Spoon". */
function drawsOn(speciesId: string): string {
  return lureClassesFor(speciesId)
    .map(({ lure, hours }) => (hours && hours.length < 4 ? `${t(lure.label)} (${hours.map(hourName).join(", ")})` : t(lure.label)))
    .join(", ");
}

function GuideCard({ entry }: { entry: GuideEntry }) {
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
            {t("{caught} landed · PB {weight} lb", { caught: entry.caught, weight: oneDecimal(entry.heaviest ?? 0) })}
          </p>
          <p>{t("Trophy ≥ {weight} lb", { weight: oneDecimal(trophyWeight(species)) })}</p>
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
      {known && peakSeason(species.id) && <p className="guide-season">{t("Runs in {season}", { season: t(SEASON_LABELS[peakSeason(species.id)!]).toLowerCase() })}</p>}
    </article>
  );
}

export function FieldGuide({ stats }: Props) {
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
      <p className="guide-note">{t("Lure and time clues assume a cast released in the band.")}</p>
      <div className="guide-grid">
        {entries.map((entry) => (
          <GuideCard key={entry.species.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
