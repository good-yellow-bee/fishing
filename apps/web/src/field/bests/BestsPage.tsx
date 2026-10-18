import { Fragment } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { speciesCounts, speciesLink } from "../speciesLink";
import { biteTimes, catchesNewestFirst, fishCountsByTrip, localDate, measureOf, lureTally, moonTally, personalBests, seasonTally, skyTally, spotById, type CatchEntry } from "@stillwater/shared";
import { CatchCard } from "../cards";
import { num, t, useT } from "../../i18n";
import { measureText } from "../../i18n/content";
import { fishCountLabel, formatDay, outingNameById } from "../format";
import { hookTally, hookText } from "../hookTally";
import { useLogbook } from "../LogbookState";
import { TallyBars } from "../TallyBars";
import { WeatherBars } from "../WeatherBars";
import { exactTerm, findLink } from "../CatchSearch";
import { findWithLink } from "../findLinks";
import { bestFishDay, catchMonth, daysOut, monthName, monthTally, yearTally } from "../tripMonths";
import { YearGoal, readYearGoal } from "../YearGoal";
import { DayCalendar } from "./DayCalendar";
import { SeasonRecapBox } from "./SeasonRecap";
import { dayMarks } from "./dayMarks";
import { mostKindsDay } from "./mostKinds";
import { newWatersThisYear, notYetThisYear } from "./notYet";
import { CopySummary } from "../CopySummary";
import { yearSummary } from "../summaries";
import { outingStreak, weekStreak, weekendSplit } from "../outingAverage";
import { MonthYearTable } from "./MonthYearTable";
import { PLAY_LAKE_ID, offPlayLake, withoutPlayLake } from "../playLake";
import { countedBook, countedFish } from "../milestones";
import { SameKinds } from "./SameKinds";

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


/** The best day's count: its outing when all its fish were on one, else that day's fish in the search. */
function DayTally({ count, date, tripId, tail }: { count: number; date: string; tripId: string | null; tail: (term: string) => string }) {
  return <Link to={tripId ? `/trips/${tripId}` : findLink(tail(date))}>{fishCountLabel(count)}</Link>;
}

/** A water's fish count, and which kind it gives most when one kind leads. */
function waterFishLine(catches: readonly CatchEntry[]): string {
  const fish = fishCountLabel(catches.length);
  const [top, next] = speciesCounts(catches);
  if (!top || catches.length < 2) return fish;
  if (!next) return t("{fish}, all {species}", { fish, species: t(top.species) });
  return top.count > next.count ? t("{fish}, mostly {species}", { fish, species: t(top.species) }) : fish;
}

/** "Last fish: Sat, Oct 10" under a water, from its newest fish. */
function lastFishLine(catches: readonly CatchEntry[]) {
  const last = catches.reduce<string | null>((newest, entry) => (!newest || entry.caughtAt > newest ? entry.caughtAt : newest), null);
  return last ? <p className="meta">{t("Last fish: {day}", { day: formatDay(localDate(new Date(last))) })}</p> : null;
}

/** "?year=2025": one season's fish and outings, or the whole book when it is left out. */
const YEAR_PARAM = "year";

export function BestsPage() {
  const { book: all } = useLogbook();
  useT();
  const [params, setParams] = useSearchParams();
  const today = localDate(new Date());
  // The goal, days out and streak are about this year and the run of outings, so they read the whole book.
  // Real days on the water: a round on the game's lake neither counts as a day out nor ends a blank spell.
  // Records are the angler's own: the game's lake, its rounds and its fish stay out of every tile, tally and calendar here,
  // and each search link leaves them out too, so a count and the list it opens agree.
  const whole = { ...all, spots: all.spots.filter((spot) => spot.id !== PLAY_LAKE_ID), trips: all.trips.filter(offPlayLake), catches: all.catches.filter(offPlayLake) };
  const real = whole;
  const tail = (term: string) => withoutPlayLake(all, term, all.catches);
  // This year's count leaves the sample week out once the angler has fish of their own, as Home's does.
  const counted = countedBook(all);
  const days = daysOut(counted, today.slice(0, 4), today);
  const notYet = notYetThisYear(real.catches);
  const newWaters = newWatersThisYear(real.catches).flatMap((id) => whole.spots.filter((spot) => spot.id === id));
  const wholeFishByTrip = fishCountsByTrip(whole);
  const streak = outingStreak(real.trips, (id) => wholeFishByTrip.get(id) ?? 0, today);
  const weeks = weekStreak(real.trips, today);
  const split = weekendSplit(real.trips, (id) => wholeFishByTrip.get(id) ?? 0, today);
  const years = yearTally(whole.catches).map((row) => row.year);
  const asked = params.get(YEAR_PARAM);
  const year = asked && years.includes(asked) ? asked : null;
  // Everything else is worked out from the season picked, fish and outings alike.
  const book = year
    ? { ...whole, catches: whole.catches.filter((entry) => catchMonth(entry).startsWith(`${year}-`)), trips: whole.trips.filter((trip) => trip.date.startsWith(`${year}-`)) }
    : whole;
  // A row's link opens the same fish it counted: within the season picked, when there is one.
  const linkFor = (term: string) => (year ? findWithLink(term, tail(year)) : findLink(tail(term)));
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
  // The angler's own fish once there are any, as the Catches page sums them.
  const bests = personalBests({ ...book, catches: countedFish(book.catches) });
  // Each water's fish, newest first, gathered in one pass rather than sorting the book once per water.
  const bySpot = new Map<string, CatchEntry[]>();
  for (const entry of catchesNewestFirst(book)) {
    const list = bySpot.get(entry.spotId);
    if (list) list.push(entry);
    else bySpot.set(entry.spotId, [entry]);
  }
  // Counted as the calendar below counts its days, so the tile and the calendar agree.
  const topDay = bestFishDay(book);
  const kindsDay = mostKindsDay(book);
  // When every fish of the best day came on one outing, the tile opens that outing.
  const topDayTrip = topDay?.tripId ?? null;
  const released = book.catches.filter((entry) => entry.released).length;
  const hooks = hookTally(book);
  const nameOf = (spotId: string) => spotById(book, spotId)?.name ?? t("Unknown water");
  const titleOf = (tripId: string | null) => (tripId ? outingNameById(book, tripId) : null);

  // A book with no fish and no outings yet: one line and the way to the first, not a page of empty tiles. Outings
  // alone still have their days on the water and calendar to show.
  if (whole.catches.length === 0 && whole.trips.length === 0) {
    return (
      <div className="sheet">
        <header className="sheet-head">
          <div>
            <p className="eyebrow">{t("Personal bests")}</p>
            <h1>{t("Bests")}</h1>
          </div>
        </header>
        <p className="empty">
          {t("Nothing landed in the book yet.")} <Link to="/catches/new">{t("Log a catch")}</Link>
        </p>
      </div>
    );
  }

  const months = monthTally(book.catches);
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
      {year ? <SeasonRecapBox book={whole} year={year} today={today} /> : null}

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
          <strong>{topDay ? <DayTally count={topDay.count} date={topDay.date} tripId={topDayTrip} tail={tail} /> : t("None")}</strong>
          <small>{topDay ? formatDay(topDay.date) : t("Nothing landed in the book yet.")}</small>
        </div>
      </section>
      {kindsDay ? (
        <p className="meta most-kinds">
          <Link to={linkFor(kindsDay.date)}>{t("Most kinds in one day: {count}, on {day}", { count: kindsDay.kinds, day: formatDay(kindsDay.date) })}</Link>
        </p>
      ) : null}
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
              <h2 id="by-species" tabIndex={-1}>{t("By species")}</h2>
            </div>
            <SameKinds />
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

          {/* This year's own numbers: a past season picked above has its recap instead. */}
          {!year || year === today.slice(0, 4) ? (
            <section>
              <div className="section-head">
                <h2>{t("This year's goal")}</h2>
              </div>
              <YearGoal catches={counted.catches} />
              {days > 0 ? <p className="meta">{t("Days on the water in {year}: {count}", { year: today.slice(0, 4), count: days })}</p> : null}
              {/* Last year's kinds still to show up this year, each opening its page. */}
              {notYet.length > 0 ? (
                <p className="meta not-yet">
                  <span>
                    {t("Not yet this year:")}{" "}
                    {notYet.map((name, index) => (
                      <Fragment key={name}>
                        {index > 0 ? ", " : null}
                        <Link to={`/species/${encodeURIComponent(name)}`}>{t(name)}</Link>
                      </Fragment>
                    ))}
                  </span>
                </p>
              ) : null}
              {/* Waters that gave their first fish this year: where the season went exploring. */}
              {newWaters.length > 0 ? (
                <p className="meta new-waters">
                  <span>
                    {t("New waters this year:")}{" "}
                    {newWaters.map((spot, index) => (
                      <Fragment key={spot.id}>
                        {index > 0 ? ", " : null}
                        <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
                      </Fragment>
                    ))}
                  </span>
                </p>
              ) : null}
              {/* Outings in a row that each gave a fish, once there is a run worth naming. */}
              {streak.best > 1 ? (
                <p className="meta">
                  {streak.going ? t("Outings in a row with a fish: {count}, and still going", { count: streak.best }) : t("Most outings in a row with a fish: {count}", { count: streak.best })}
                </p>
              ) : null}
              {/* Weeks in a row with a day out, fish or not: the habit, once it has run three weeks. */}
              {weeks.best > 2 ? (
                <p className="meta">
                  {weeks.going ? t("Weeks in a row on the water: {count}, and still going", { count: weeks.best }) : t("Most weeks in a row on the water: {count}", { count: weeks.best })}
                </p>
              ) : null}
              {/* The other side of the streak: how long the blank spell ran, once it ran past one. */}
              {streak.dry > 1 ? <p className="meta">{t("Most outings in a row without a fish: {count}", { count: streak.dry })}</p> : null}
              {/* A blank spell still running: how long since an outing gave a fish. */}
              {streak.dryNow > 1 && streak.best > 0 ? <p className="meta">{t("Outings since your last fish: {count}", { count: streak.dryNow })}</p> : null}
              {split ? (
                <p className="meta weekend-split">
                  {t("Fish an outing: {weekend} on weekends, {weekday} on weekdays.", { weekend: num(split.weekend), weekday: num(split.weekday) })}
                </p>
              ) : null}
              {/* The year so far as text for a message, once it has a fish. */}
              {whole.catches.some((entry) => catchMonth(entry).startsWith(`${today.slice(0, 4)}-`)) ? (
                <CopySummary text={() => yearSummary(counted, today.slice(0, 4), today, readYearGoal(today.slice(0, 4)))} file="stillwater-year.txt" />
              ) : null}
            </section>
          ) : null}

          {dayMarks(whole, year ?? today.slice(0, 4)).size > 0 ? (
            <section>
              <div className="section-head">
                <h2>{t("Days out in {year}", { year: year ?? today.slice(0, 4) })}</h2>
              </div>
              <p className="meta">{t("A stronger shade means more fish; a thick outline was an outing with none, a thin one is an outing ahead.")}</p>
              <DayCalendar book={whole} year={year ?? today.slice(0, 4)} today={today} tail={tail} />
            </section>
          ) : null}

          {!year && years.length > 1 ? (
            <section>
              <div className="section-head">
                <h2>{t("By year")}</h2>
              </div>
              {/* Each year opens the catch search for its fish. */}
              <TallyBars key={year ?? ""} rows={yearTally(book.catches).map((row) => ({ key: row.year, label: row.year, count: row.count, to: findLink(tail(row.year)) }))} />
            </section>
          ) : null}

          {months.length > 1 ? (
            <section>
              <div className="section-head">
                <h2>{t("By month")}</h2>
              </div>
              {/* Each month opens the catch search for its fish. */}
              <TallyBars
                rows={months.map((row) => ({
                  key: row.month,
                  label: monthName(row.month),
                  count: row.count,
                  to: row.count > 0 ? findLink(tail(row.month)) : undefined,
                }))}
              />
            </section>
          ) : null}

          {!year ? <MonthYearTable catches={book.catches} tail={tail} /> : null}

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
          <WeatherBars key={year ?? ""} book={book} within={year ? tail(year) : tail("").trim() || undefined} />

          <section>
            <div className="section-head">
              <h2>{t("Lures that worked")}</h2>
            </div>
            {/* Every lure that took a fish, the top five until asked for the rest. */}
            <TallyBars key={year ?? ""} limit={5} rows={lureTally(book, Infinity).map((row) => ({ key: row.lure, label: t(row.lure), count: row.count, to: linkFor(exactTerm("lure", t(row.lure))) }))} />
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
                  {/* When it last gave one: a water gone quiet is worth a visit, or a rest. */}
                  {lastFishLine(bySpot.get(water.spotId) ?? [])}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
