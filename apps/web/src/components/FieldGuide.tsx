import { fieldGuide, guideProgress, type CatchStat, type GuideEntry, type Rarity } from "@stillwater/shared";

type Props = {
  stats: CatchStat[];
};

const SILHOUETTE = "M6 18C16 7 36 4 52 12L74 5L65 18L74 31L52 24C36 32 16 29 6 18Z";

function FishMark({ known, rarity }: { known: boolean; rarity: Rarity }) {
  return (
    <svg className="guide-fish" viewBox="0 0 80 36" aria-hidden>
      <path d={SILHOUETTE} data-rarity={known ? rarity : "unknown"} />
    </svg>
  );
}

function GuideCard({ entry }: { entry: GuideEntry }) {
  const known = entry.caught > 0;
  return (
    <article className={`guide-card ${known ? `rarity-${entry.species.rarity}` : "unknown"}`}>
      <FishMark known={known} rarity={entry.species.rarity} />
      {known ? <span className="rarity-tag">{entry.species.rarity}</span> : <span className="rarity-tag">unlogged</span>}
      <h3>{known ? entry.species.name : "Unknown"}</h3>
      {known ? (
        <p>
          {entry.caught} landed · PB {entry.heaviest?.toFixed(1)} lb
        </p>
      ) : (
        <p>Not yet in the book</p>
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
      <div className="guide-grid">
        {entries.map((entry) => (
          <GuideCard key={entry.species.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
