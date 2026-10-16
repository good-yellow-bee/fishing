import { Link, useSearchParams } from "react-router-dom";
import { speciesCounts, speciesLink } from "../speciesLink";
import { bestDay, biteTimes, catchesNewestFirst, fishCountsByTrip, localDate, measureOf, type Logbook, lureTally, moonTally, personalBests, seasonTally, skyTally, spotById, tripById, type CatchEntry } from "@stillwater/shared";
import { CatchCard } from "../cards";
import { t, useT } from "../../i18n";
import { measureText } from "../../i18n/content";
import { fishCountLabel, formatDay } from "../format";
import { hookTally, hookText } from "../hookTally";
import { useLogbook } from "../LogbookState";
import { TallyBars } from "../TallyBars";
import { WeatherBars } from "../WeatherBars";
import { exactTerm, findLink } from "../CatchSearch";
import { findWithLink } from "../findLinks";
import { catchMonth, daysOut, monthName, monthTally, yearTally } from "../tripMonths";
import { YearGoal, readYearGoal } from "../YearGoal";
import { CopySummary } from "../CopySummary";
import { yearSummary } from "../summaries";
import { outingStreak } from "../outingAverage";

function bestMeasures(longest: CatchEntry | null, heaviest: CatchEntry | null): string {
  const parts: string[] = [];
  // A fish both measured and weighed may be the longest by its other measure: show the one it is best by.
  if (longest) parts.push(measureText(measureOf(longest, "length")!));
  if (heaviest) parts.push(measureText(measureOf(heaviest, "weight")!));
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
      <CatchCard entry={entry} spotName={spotName} tripTitle={tripTitle} level={4} />
    </div>
  );
}

function soleTripOn(book: Logbook, ymd: string): string | null {
  const trips = new Set(book.catches.filter((entry) => localDate(new Date(entry.caughtAt)) === ymd).map((entry) => entry.tripId ?? ""));
  const [only] = [...trips];
  return trips.size === 1 && only ? only : null;
}

/** The best day's count: its outing when all its fish were on one, else that day's fish in the search. */
function DayTally({ count, date, tripId }: { count: number; date: string; tripId: string | null }) {
  return <Link to={tripId ? `/trips/${tripId}` : findLink(date)}>{fishCountLabel(count)}</Link>;
}

/** A water's fish count, and which kind it gives most when one kind leads. */
function waterFishLine(catches: readonly CatchEntry[]): string {
  const fish = fishCountLabel(catches.length);
  const [top, next] = speciesCounts(catches);
  if (!top || catches.length < 2) return fish;
  if (!next) return t("{fish}, all {species}", { fish, species: t(top.species) });
  return top.count > next.count ? t("{fish}, mostly {species}", { fish, species: t(top.species) }) : fish;
}

/** "?year=2025": one season's fish and outings, or the whole book when it is left out. */
const YEAR_PARAM = "year";

export function BestsPage() {
  const { book: whole } = useLogbook();
  useT();
  const [params, setParams] = useSearchParams();
  const today = localDate(new Date());
  // The goal, days out and streak are about this year and the run of outings, so they read the whole book.
  const days = daysOut(whole, today.slice(0, 4), today);
  const wholeFishByTrip = fishCountsByTrip(whole);
  const streak = outingStreak(whole.trips, (id) => wholeFishByTrip.get(id) ?? 0, today);
  const years = yearTally(whole.catches).map((row) => row.year);
  const asked = params.get(YEAR_PARAM);
  const year = asked && years.includes(asked) ? asked : null;
  // Everything else is worked out from the season picked, fish and outings alike.
  const book = year
    ? { ...whole, catches: whole.catches.filter((entry) => catchMonth(entry).startsWith(`${year}-`)), trips: whole.trips.filter((trip) => trip.date.startsWith(`${year}-`)) }
    : whole;
  // A row's link opens the same fish it counted: within the season picked, when there is one.
  const linkFor = (term: string) => (year ? findWithLink(term, year) : findLink(term));
  const pickYear = (next: string | null) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next) out.set(YEAR_PARAM, next);
        else out.delete(YEAR_PARAM);
        return out;
      },
      { replace: true },
    );
  const bests = personalBests(book);
  // Each water's fish, newest first, gathered in one pass rather than sorting the book once per water.
  const bySpot = new Map<string, CatchEntry[]>();
  for (const entry of catchesNewestFirst(book)) {
    const list = bySpot.get(entry.spotId);
    if (list) list.push(entry);
    else bySpot.set(entry.spotId, [entry]);
  }
  const topDay = bestDay(book);
  // When every fish of the best day came on one outing, the tile opens that outing.
  const topDayTrip = topDay ? soleTripOn(book, topDay.date) : null;
  const released = book.catches.filter((entry) => entry.released).length;
  const hooks = hookTally(book);
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

      {/* One season at a time, once the book spans more than one. */}
      {years.length > 1 ? (
        <p className="bests-scope" role="group" aria-label={t("Which seasons")}>
          <button type="button" className="text-button" aria-pressed={!year} onClick={() => pickYear(null)}>
            {t("All time")}
          </button>
          {years.map((each) => (
            <button key={each} type="button" className="text-button" aria-pressed={year === each} onClick={() => pickYear(each)}>
              {each}
            </button>
          ))}
        </p>
      ) : null}

      <section className="stat-row" data-cols="4" aria-label={t("Personal bests")}>
        <div>
          <span className="eyebrow">{t("Longest")}</span>
          <strong>
            {bests.longest ? <Link to={`/catches/${bests.longest.id}`}>{measureText(measureOf(bests.longest, "length")!)}</Link> : t("None")}
          </strong>
          <small>{bests.longest ? t(bests.longest.species) : t("No length in the book")}</small>
        </div>
        <div>
          <span className="eyebrow">{t("Heaviest")}</span>
          <strong>
            {bests.heaviest ? <Link to={`/catches/${bests.heaviest.id}`}>{measureText(measureOf(bests.heaviest, "weight")!)}</Link> : t("None")}
          </strong>
          <small>{bests.heaviest ? t(bests.heaviest.species) : t("No weight in the book")}</small>
        </div>
        <div>
          <span className="eyebrow">{t("Waters with fish")}</span>
          <strong>{book.spots.length > 0 ? <Link to="/spots">{bests.watersWithFish}</Link> : bests.watersWithFish}</strong>
          <small>
            {book.spots.length === 0
              ? t("No waters in the book")
              : t("{count} of {total}", { count: bests.watersWithFish, total: book.spots.length })}
          </small>
        </div>
        <div>
          <span className="eyebrow">{t("Best day")}</span>
          <strong>{topDay ? <DayTally count={topDay.count} date={topDay.date} tripId={topDayTrip} /> : t("None")}</strong>
          <small>{topDay ? formatDay(topDay.date) : t("Nothing landed in the book yet.")}</small>
        </div>
      </section>
      {released > 0 ? (
        <p className="meta released-share">
          {/* Opens the released fish in the catch search. */}
          <Link to={linkFor(t("Released"))}>{t("Released: {count} of {total}", { count: released, total: book.catches.length })}</Link>
        </p>
      ) : null}
      {hooks ? <p className="meta">{hookText(hooks)}</p> : null}

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
                      <h3>
                        {/* In a picked season, the kind's fish of that season, as counted here. */}
                        <Link to={year ? linkFor(exactTerm("species", t(row.species))) : speciesLink(row.species)}>{t(row.species)}</Link>
                      </h3>
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
            <TallyBars key={year ?? ""} rows={biteTimes(book).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? linkFor(exactTerm("time", t(row.label))) : undefined }))} />
          </section>

          <section>
            <div className="section-head">
              <h2>{t("This year's goal")}</h2>
            </div>
            <YearGoal catches={whole.catches} />
            {days > 0 ? <p className="meta">{t("Days on the water in {year}: {count}", { year: today.slice(0, 4), count: days })}</p> : null}
            {/* Outings in a row that each gave a fish, once there is a run worth naming. */}
            {streak.best > 1 ? (
              <p className="meta">
                {streak.going ? t("Outings in a row with a fish: {count}, and still going", { count: streak.best }) : t("Most outings in a row with a fish: {count}", { count: streak.best })}
              </p>
            ) : null}
            {/* The year so far as text for a message, once it has a fish. */}
            {whole.catches.some((entry) => catchMonth(entry).startsWith(`${today.slice(0, 4)}-`)) ? (
              <CopySummary text={() => yearSummary(whole, today.slice(0, 4), today, readYearGoal(today.slice(0, 4)))} file="stillwater-year.txt" />
            ) : null}
          </section>

          {!year && years.length > 1 ? (
            <section>
              <div className="section-head">
                <h2>{t("By year")}</h2>
              </div>
              {/* Each year opens the catch search for its fish. */}
              <TallyBars key={year ?? ""} rows={yearTally(book.catches).map((row) => ({ key: row.year, label: row.year, count: row.count, to: findLink(row.year) }))} />
            </section>
          ) : null}

          {monthTally(book.catches).length > 1 ? (
            <section>
              <div className="section-head">
                <h2>{t("By month")}</h2>
              </div>
              {/* Each month opens the catch search for its fish. */}
              <TallyBars
                rows={monthTally(book.catches).map((row) => ({
                  key: row.month,
                  label: monthName(row.month),
                  count: row.count,
                  to: findLink(row.month),
                }))}
              />
            </section>
          ) : null}

          <section>
            <div className="section-head">
              <h2>{t("By season")}</h2>
            </div>
            <TallyBars key={year ?? ""} rows={seasonTally(book).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? linkFor(exactTerm("season", t(row.label))) : undefined }))} />
          </section>

          <section>
            <div className="section-head">
              <h2>{t("By the moon")}</h2>
            </div>
            <TallyBars key={year ?? ""} rows={moonTally(book).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? linkFor(exactTerm("moon", t(row.label))) : undefined }))} />
          </section>

          {skyTally(book).some((row) => row.count > 0) ? (
            <section>
              <div className="section-head">
                <h2>{t("By the weather")}</h2>
              </div>
              <TallyBars key={year ?? ""} rows={skyTally(book).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? linkFor(exactTerm("sky", t(row.label))) : undefined }))} />
            </section>
          ) : null}
          <WeatherBars key={year ?? ""} book={book} within={year ?? undefined} />

          <section>
            <div className="section-head">
              <h2>{t("Lures that worked")}</h2>
            </div>
            <TallyBars key={year ?? ""} rows={lureTally(book).map((row) => ({ key: row.lure, label: t(row.lure), count: row.count, to: linkFor(exactTerm("lure", t(row.lure))) }))} />
          </section>

          <section>
            <div className="section-head">
              <h2>{t("Waters with fish")}</h2>
            </div>
            <div className="card-grid">
              {bests.waters.map((water) => (
                <Link key={water.spotId} to={year ? linkFor(exactTerm("water", water.name)) : `/spots/${water.spotId}`} className="spot-card">
                  <div className="spot-card-top">
                    <h3>{water.name === "Unknown water" ? t(water.name) : water.name}</h3>
                  </div>
                  <p className="meta">{waterFishLine(bySpot.get(water.spotId) ?? [])}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
