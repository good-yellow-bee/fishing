import { Link } from "react-router-dom";
import { findLink } from "../CatchSearch";
import { bestDay, biteTimes, lureTally, personalBests, seasonTally, spotById, tripById, type CatchEntry } from "@stillwater/shared";
import { CatchCard } from "../cards";
import { t, useT } from "../../i18n";
import { measureText } from "../../i18n/content";
import { fishCountLabel, formatDay } from "../format";
import { useLogbook } from "../LogbookState";

function bestMeasures(longest: CatchEntry | null, heaviest: CatchEntry | null): string {
  const parts: string[] = [];
  if (longest) parts.push(measureText(longest.measure));
  if (heaviest) parts.push(measureText(heaviest.measure));
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
  useT();
  return (
    <div>
      <h3 className="subhead">{t("Large · {label}", { label })}</h3>
      <CatchCard entry={entry} spotName={spotName} tripTitle={tripTitle} />
    </div>
  );
}

/** A count per row with a bar drawn to scale; the bar is for the eye, the words carry the number. */
function TallyBars({ rows }: { rows: Array<{ key: string; label: string; count: number }> }) {
  const most = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ol className="tally-bars">
      {rows.map((row) => (
        <li key={row.key} data-empty={row.count === 0 ? "1" : "0"}>
          <span className="tally-label">{row.label}</span>
          <span className="tally-bar" aria-hidden="true">
            <span style={{ width: `${(row.count / most) * 100}%` }} />
          </span>
          <span className="tally-count">{row.count === 0 ? t("None") : fishCountLabel(row.count)}</span>
        </li>
      ))}
    </ol>
  );
}

export function BestsPage() {
  const { book } = useLogbook();
  useT();
  const bests = personalBests(book);
  const topDay = bestDay(book);
  const released = book.catches.filter((entry) => entry.released).length;
  const nameOf = (spotId: string) => spotById(book, spotId)?.name ?? t("Unknown water");
  const titleOf = (tripId: string | null) => (tripId ? (tripById(book, tripId)?.title ?? null) : null);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Personal bests")}</p>
          <h1>{t("Bests")}</h1>
          <p className="lede">
            {t("The largest fish in this book, how the species add up, when and on what they bite, and which waters have given one up.")}
          </p>
        </div>
      </header>

      <section className="stat-row" data-cols="4" aria-label={t("Personal bests")}>
        <div>
          <span className="eyebrow">{t("Longest")}</span>
          <strong>{bests.longest ? measureText(bests.longest.measure) : t("None")}</strong>
          <small>{bests.longest ? t(bests.longest.species) : t("No length in the book")}</small>
        </div>
        <div>
          <span className="eyebrow">{t("Heaviest")}</span>
          <strong>{bests.heaviest ? measureText(bests.heaviest.measure) : t("None")}</strong>
          <small>{bests.heaviest ? t(bests.heaviest.species) : t("No weight in the book")}</small>
        </div>
        <div>
          <span className="eyebrow">{t("Waters with fish")}</span>
          <strong>{bests.watersWithFish}</strong>
          <small>
            {book.spots.length === 0
              ? t("No waters in the book")
              : t("{count} of {total}", { count: bests.watersWithFish, total: book.spots.length })}
          </small>
        </div>
        <div>
          <span className="eyebrow">{t("Best day")}</span>
          <strong>{topDay ? fishCountLabel(topDay.count) : t("None")}</strong>
          <small>{topDay ? formatDay(topDay.date) : t("Nothing landed in the book yet.")}</small>
        </div>
      </section>
      {released > 0 ? (
        <p className="meta released-share">{t("Released: {count} of {total}", { count: released, total: book.catches.length })}</p>
      ) : null}

      {book.catches.length === 0 ? (
        <p className="empty">{t("Nothing landed in the book yet.")}</p>
      ) : (
        <>
          <section>
            <div className="section-head">
              <h2>{t("Biggest fish")}</h2>
            </div>
            <div className="stack">
              {bests.longest ? (
                <LargeFish
                  label={t("longest")}
                  entry={bests.longest}
                  spotName={nameOf(bests.longest.spotId)}
                  tripTitle={titleOf(bests.longest.tripId)}
                />
              ) : (
                <p className="empty">{t("No length in the book.")}</p>
              )}
              {bests.heaviest ? (
                <LargeFish
                  label={t("heaviest")}
                  entry={bests.heaviest}
                  spotName={nameOf(bests.heaviest.spotId)}
                  tripTitle={titleOf(bests.heaviest.tripId)}
                />
              ) : (
                <p className="empty">{t("No weight in the book.")}</p>
              )}
            </div>
          </section>

          <section>
            <div className="section-head">
              <h2>{t("By species")}</h2>
            </div>
            <div className="card-grid">
              {bests.species.map((row) => {
                const measures = bestMeasures(row.longest, row.heaviest);
                return (
                  <article key={row.species} className="spot-card">
                    <div className="spot-card-top">
                      <h2>
                        <Link to={findLink(t(row.species))}>{t(row.species)}</Link>
                      </h2>
                      {row.large ? <span className="stamp">{t("Large")}</span> : null}
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
              <h2>{t("When they bite")}</h2>
            </div>
            <TallyBars rows={biteTimes(book).map((row) => ({ key: row.id, label: t(row.label), count: row.count }))} />
          </section>

          <section>
            <div className="section-head">
              <h2>{t("By season")}</h2>
            </div>
            <TallyBars rows={seasonTally(book).map((row) => ({ key: row.id, label: t(row.label), count: row.count }))} />
          </section>

          <section>
            <div className="section-head">
              <h2>{t("Lures that worked")}</h2>
            </div>
            <TallyBars rows={lureTally(book).map((row) => ({ key: row.lure, label: t(row.lure), count: row.count }))} />
          </section>

          <section>
            <div className="section-head">
              <h2>{t("Waters with fish")}</h2>
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
