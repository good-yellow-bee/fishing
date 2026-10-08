import {
  fieldGuide,
  guideProgress,
  isTrophyWeight,
  LAKE_HOUR_LABELS,
  shadowSize,
  SPOT_LABELS,
  trophyWeight,
  type CatchStat,
  type GuideEntry,
  type ShadowSize,
  type SpotId,
} from "@stillwater/shared";
import { bestHourFor, lureSizeFor, type LureSize } from "../game/logic";

type Props = {
  stats: CatchStat[];
};

const SILHOUETTE = "M6 18C16 7 36 4 52 12L74 5L65 18L74 31L52 24C36 32 16 29 6 18Z";

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

function FishMark({ known, color }: { known: boolean; color: string }) {
  return (
    <svg className="guide-fish" viewBox="0 0 80 36" aria-hidden>
      <path d={SILHOUETTE} fill={known ? color : "#161310"} stroke={known ? "none" : "#6d675c"} strokeWidth={known ? 0 : 1.2} />
    </svg>
  );
}

function GuideCard({ entry }: { entry: GuideEntry }) {
  const { species } = entry;
  const known = entry.caught > 0;
  const hourAt = (spot: SpotId) => LAKE_HOUR_LABELS[bestHourFor(species, spot)].toLowerCase();
  const trophyLanded = entry.heaviest !== null && isTrophyWeight(species, entry.heaviest);
  return (
    <article className={`guide-card ${known ? `rarity-${species.rarity}` : "unknown"}`}>
      <FishMark known={known} color={species.color} />
      {known ? <span className="rarity-tag">{species.rarity}</span> : <span className="rarity-tag">unlogged</span>}
      {trophyLanded && <span className="rarity-tag guide-trophy">Trophy</span>}
      <h3>{known ? species.name : "Unknown"}</h3>
      {known && (
        <>
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
