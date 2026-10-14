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
  type GuideEntry,
  type ShadowSize,
  type SpotId,
} from "@stillwater/shared";
import { bestHourFor, lureSizeFor, type LureSize } from "../game/logic";
import { FishMark } from "./FishMark";

type Props = {
  stats: CatchStat[];
};

const SHADOW_LABELS: Record<ShadowSize, string> = {
  small: "Small shadow",
  medium: "Medium shadow",
  large: "Large shadow",
  huge: "Huge shadow",
};

const LURE_LABELS: Record<LureSize, string> = {
  small: "small lure",
  large: "big lure",
  either: "any lure",
};

/** The lure classes that pull a species harder, with the hours they work, e.g. "Live bait (night), Spoon". */
function drawsOn(speciesId: string): string {
  return lureClassesFor(speciesId)
    .map(({ lure, hours }) =>
      hours && hours.length < 4 ? `${lure.label} (${hours.map((hour) => LAKE_HOUR_LABELS[hour].toLowerCase()).join(", ")})` : lure.label,
    )
    .join(", ");
}

function GuideCard({ entry }: { entry: GuideEntry }) {
  const { species } = entry;
  const known = entry.caught > 0;
  const hourAt = (spot: SpotId) => LAKE_HOUR_LABELS[bestHourFor(species, spot)].toLowerCase();
  const trophyLanded = entry.heaviest !== null && isTrophyWeight(species, entry.heaviest);
  return (
    <article className={`guide-card ${known ? `rarity-${species.rarity}` : "unknown"}`}>
      <FishMark known={known} species={species} />
      {known ? <span className="rarity-tag">{species.rarity}</span> : <span className="rarity-tag">unlogged</span>}
      {trophyLanded && <span className="rarity-tag guide-trophy">Trophy</span>}
      <h3>{known ? species.name : "Unknown"}</h3>
      {known && (
        <>
          <p className="guide-lore">{species.lore}</p>
          <p>
            {entry.caught} landed · PB {entry.heaviest?.toFixed(1)} lb
          </p>
          <p>Trophy ≥ {trophyWeight(species).toFixed(1)} lb</p>
        </>
      )}
      <p>{SHADOW_LABELS[shadowSize(species)]}</p>
      {known ? (
        species.spots.map((spot) => (
          <p key={spot}>
            {SPOT_LABELS[spot]}: {LURE_LABELS[lureSizeFor(species, spot)]} at {hourAt(spot)}
          </p>
        ))
      ) : (
        <p>{species.spots.map((spot) => `${SPOT_LABELS[spot]} at ${hourAt(spot)}`).join(" · ")}</p>
      )}
      {known && drawsOn(species.id) && <p className="guide-draws">Draws on: {drawsOn(species.id)}</p>}
      {known && peakSeason(species.id) && <p className="guide-season">Runs in {SEASON_LABELS[peakSeason(species.id)!].toLowerCase()}</p>}
    </article>
  );
}

export function FieldGuide({ stats }: Props) {
  const entries = fieldGuide(stats);
  const { found, total } = guideProgress(entries);
  return (
    <section className="field-guide">
      <div className="panel-heading">
        <span className="eyebrow">Field guide</span>
        <h2>
          {found} / {total} species
        </h2>
      </div>
      <p className="guide-note">Lure and time clues assume a cast released in the band.</p>
      <div className="guide-grid">
        {entries.map((entry) => (
          <GuideCard key={entry.species.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
