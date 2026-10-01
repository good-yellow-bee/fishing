import { Link } from "react-router-dom";
import { formatMeasure, personalBests, spotById, tripById, type CatchEntry } from "@stillwater/shared";
import { CatchCard } from "../cards";
import { fishCountLabel } from "../format";
import { useLogbook } from "../LogbookState";

function bestMeasures(longest: CatchEntry | null, heaviest: CatchEntry | null): string {
  const parts: string[] = [];
  if (longest) parts.push(formatMeasure(longest.measure));
  if (heaviest) parts.push(formatMeasure(heaviest.measure));
  return parts.join(" · ");
}

function LargeFish({
  label,
  entry,
  spotName,
  tripTitle,
}: {
  label: string;
  entry: CatchEntry;
  spotName: string;
  tripTitle: string | null;
}) {
  return (
    <div>
      <h3 className="subhead">Large · {label}</h3>
      <CatchCard entry={entry} spotName={spotName} tripTitle={tripTitle} />
    </div>
  );
}

export function BestsPage() {
  const { book } = useLogbook();
  const bests = personalBests(book);
  const nameOf = (spotId: string) => spotById(book, spotId)?.name ?? "Unknown water";
  const titleOf = (tripId: string | null) => (tripId ? (tripById(book, tripId)?.title ?? null) : null);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">Personal bests</p>
          <h1>Bests</h1>
          <p className="lede">
            The largest fish in this book, how the species add up, and which waters have given one up.
          </p>
        </div>
      </header>

      <section className="stat-row" aria-label="Personal bests">
        <div>
          <span className="eyebrow">Longest</span>
          <strong>{bests.longest ? formatMeasure(bests.longest.measure) : "None"}</strong>
          <small>{bests.longest?.species ?? "No length in the book"}</small>
        </div>
        <div>
          <span className="eyebrow">Heaviest</span>
          <strong>{bests.heaviest ? formatMeasure(bests.heaviest.measure) : "None"}</strong>
          <small>{bests.heaviest?.species ?? "No weight in the book"}</small>
        </div>
        <div>
          <span className="eyebrow">Waters with fish</span>
          <strong>{bests.watersWithFish}</strong>
          <small>
            {book.spots.length === 0 ? "No waters in the book" : `${bests.watersWithFish} of ${book.spots.length}`}
          </small>
        </div>
      </section>

      {book.catches.length === 0 ? (
        <p className="empty">Nothing landed in the book yet.</p>
      ) : (
        <>
          <section>
            <div className="section-head">
              <h2>Biggest fish</h2>
            </div>
            <div className="stack">
              {bests.longest ? (
                <LargeFish
                  label="longest"
                  entry={bests.longest}
                  spotName={nameOf(bests.longest.spotId)}
                  tripTitle={titleOf(bests.longest.tripId)}
                />
              ) : (
                <p className="empty">No length in the book.</p>
              )}
              {bests.heaviest ? (
                <LargeFish
                  label="heaviest"
                  entry={bests.heaviest}
                  spotName={nameOf(bests.heaviest.spotId)}
                  tripTitle={titleOf(bests.heaviest.tripId)}
                />
              ) : (
                <p className="empty">No weight in the book.</p>
              )}
            </div>
          </section>

          <section>
            <div className="section-head">
              <h2>By species</h2>
            </div>
            <div className="card-grid">
              {bests.species.map((row) => {
                const measures = bestMeasures(row.longest, row.heaviest);
                return (
                  <article key={row.species} className="spot-card">
                    <div className="spot-card-top">
                      <h2>{row.species}</h2>
                      {row.large ? <span className="stamp">Large</span> : null}
                    </div>
                    <p className="meta">
                      {fishCountLabel(row.count)}
                      {measures ? ` · ${measures}` : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <div className="section-head">
              <h2>Waters with fish</h2>
            </div>
            <div className="card-grid">
              {bests.waters.map((water) => (
                <Link key={water.spotId} to={`/spots/${water.spotId}`} className="spot-card">
                  <div className="spot-card-top">
                    <h2>{water.name}</h2>
                  </div>
                  <p className="meta">{fishCountLabel(water.count)}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
