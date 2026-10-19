import { Fragment, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { speciesCounts, speciesLink, speciesWaters } from "../speciesLink";
import { biteTimes, catchesNewestFirst, fishCountsByTrip, localDate, measureOf, lureTally, moonTally, personalBests, seasonTally, skyTally, spotById, type CatchEntry, type Logbook } from "@stillwater/shared";
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
import { bestFishDay, bookFishDay, daysOut, monthName, monthTally, yearTally } from "../tripMonths";
import { GOAL_PARAM, YearGoal } from "../YearGoal";
import { DayCalendar } from "./DayCalendar";
import { FROM_LIST } from "../leaveDeleted";
import { SeasonRecapBox, seasonCopy } from "./SeasonRecap";
import { seasonRecap } from "./seasonRecap";
import { dayMarks } from "./dayMarks";
import { mostKindsDay } from "./mostKinds";
import { newWatersThisYear, notYetThisYear } from "./notYet";
import { CopySummary } from "../CopySummary";
import { outingStreak, weekStreak, weekendSplit } from "../outingAverage";
import { MonthYearTable } from "./MonthYearTable";
import { PLAY_LAKE_ID } from "../playLake";
import { countedSearch } from "../countedSearch";
import { countedBook, countedFish } from "../milestones";
import { isSampleCatch, isSampleOuting, withoutSample } from "../bookCopy";
import { SameKinds } from "./SameKinds";
import { tripDaySearch } from "../tripSearch";

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
  return (
    <Link to={tripId ? `/trips/${tripId}` : findLink(tail(date))} state={tripId ? FROM_LIST : undefined} aria-label={t("Best day: {day} · {fish}", { day: formatDay(date), fish: fishCountLabel(count) })}>
      {fishCountLabel(count)}
    </Link>
  );
}

/** A water's fish count, and which kind it gives most when one kind leads. */
function waterFishLine(catches: readonly CatchEntry[]): string {
  const fish = fishCountLabel(catches.length);
  const [top, next] = speciesCounts(catches);
  if (!top || catches.length < 2) return fish;
  if (!next) return t("{fish}, all {species}", { fish, species: t(top.species) });
  return top.count > next.count ? t("{fish}, mostly {species}", { fish, species: t(top.species) }) : fish;
}

/** "Last fish: Sat, Oct 10" under a water, from its newest fish, on the day it counts on (a night fish on its outing's). */
function lastFishLine(book: Logbook, catches: readonly CatchEntry[]) {
  const last = catches.reduce<CatchEntry | null>((newest, entry) => (!newest || entry.caughtAt > newest.caughtAt ? entry : newest), null);
  return last ? <p className="meta">{t("Last fish: {day}", { day: formatDay(bookFishDay(book, last)) })}</p> : null;
}

/** "?year=2025": one season's fish and outings, or the whole book when it is left out. */
const YEAR_PARAM = "year";

/** A kind's best lure and best water, once one of each took two or more: where and on what to go for it. */
function KindLeaders({ book, species }: { book: Logbook; species: string }) {
  const key = species.trim().toLowerCase();
  const fish = book.catches.filter((entry) => entry.species.trim().toLowerCase() === key);
  const [lure, nextLure] = lureTally({ ...book, catches: fish }, 2);
  const [water, nextWater] = speciesWaters(book, fish);
  // A tie has no leader, as the catch search's own "Most on" line takes it.
  const parts = [
    lure && lure.count >= 2 && lure.count > (nextLure?.count ?? 0) ? t("Most on {lure} ({count})", { lure: t(lure.lure), count: lure.count }) : null,
    water && water.name && water.count >= 2 && water.count > (nextWater?.count ?? 0) ? t("Most from {water} ({count})", { water: water.name, count: water.count }) : null,
  ].filter(Boolean);
  return parts.length > 0 ? <p className="meta kind-leaders">{parts.join(" · ")}</p> : null;
}

export function BestsPage() {
  const { book: all } = useLogbook();
  useT();
  const [params, setParams] = useSearchParams();
  // "?goal=set" opens the goal form once, on arrival from Home: taken out of the address, Back and Forward to Bests
  // land on its heading like any page rather than opening the form again.
  useEffect(() => {
    if (!params.has(GOAL_PARAM)) return;
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        out.delete(GOAL_PARAM);
        return out;
      },
      { replace: true },
    );
  }, []);
  const today = localDate(new Date());
  // The goal, days out and streak are about this year and the run of outings, so they read the whole book.
  // Real days on the water: a round on the game's lake neither counts as a day out nor ends a blank spell.
  // Records are the angler's own: the game's lake, its rounds and its fish stay out of every tile, tally and calendar here,
  // and each search link leaves them out too, so a count and the list it opens agree.
  // And the sample week stays out once the angler has fish of their own, as Home counts them, so a best day, a tally
  // or a streak is never one of its made-up days.
  const counted = countedBook(all);
  // The sample's waters go with its fish and outings, as taking the sample week out would take them.
  const ownAny = counted.catches.some((entry) => !isSampleCatch(entry.id)) || counted.trips.some((trip) => !isSampleOuting(trip));
  // But a sample water keeps its name while a fish or outing still counted here is on it: an outing planned before the
  // first own fish leaves the sample's fish counted, and their waters would read "Unknown water".
  const used = new Set([...counted.catches.map((entry) => entry.spotId), ...counted.trips.map((trip) => trip.spotId)]);
  const kept = new Set((ownAny ? withoutSample(all) : all).spots.map((spot) => spot.id));
  const whole = { ...counted, spots: all.spots.filter((spot) => spot.id !== PLAY_LAKE_ID && (kept.has(spot.id) || used.has(spot.id))) };
  const real = whole;
  const tail = (term: string) => countedSearch(all, term, all.catches);
  const days = daysOut(whole, today.slice(0, 4), today);
  // A night session's small hours on its outing's day, as the calendar and the goal count them.
  const dayOf = (entry: CatchEntry) => bookFishDay(whole, entry);
  const monthOf = (entry: CatchEntry) => dayOf(entry).slice(0, 7);
  const notYet = notYetThisYear(real.catches, new Date(), undefined, dayOf);
  const newWaters = newWatersThisYear(real.catches, new Date(), dayOf).flatMap((id) => whole.spots.filter((spot) => spot.id === id));
  const wholeFishByTrip = fishCountsByTrip(whole);
  const streak = outingStreak(
    real.trips,
    (id) => wholeFishByTrip.get(id) ?? 0,
    today,
    real.catches.filter((entry) => !entry.tripId).map((entry) => bookFishDay(real, entry)),
  );
  const weeks = weekStreak(real.trips, today, (id) => wholeFishByTrip.get(id) ?? 0);
  const split = weekendSplit(real.trips, (id) => wholeFishByTrip.get(id) ?? 0, today);
  const fishYears = yearTally(whole.catches, monthOf).map((row) => row.year);
  // A season with days out but no fish yet can be picked too: its recap says so, and Home's goal line links it.
  const years = [...new Set([...fishYears, ...whole.trips.filter((trip) => trip.date < today).map((trip) => trip.date.slice(0, 4))])].sort((a, b) => b.localeCompare(a));
  const asked = params.get(YEAR_PARAM);
  const year = asked && years.includes(asked) ? asked : null;
  // Everything else is worked out from the season picked, fish and outings alike.
  const book = year
    ? // By the day a fish counts on, as the goal, the calendar and the season's search links take it, so each count opens its fish.
      { ...whole, catches: whole.catches.filter((entry) => dayOf(entry).startsWith(`${year}-`)), trips: whole.trips.filter((trip) => trip.date.startsWith(`${year}-`)) }
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
  // Counted as the calendar below counts its days, so the tile and the calendar agree: in a season, its fish by the day
  // they count on, with every outing to file a night session's small hours under.
  const dayBook = year ? { ...whole, catches: whole.catches.filter((entry) => dayOf(entry).startsWith(`${year}-`)) } : book;
  const topDay = bestFishDay(dayBook);
  const kindsDay = mostKindsDay(dayBook);
  // When every fish of the best day came on one outing and that outing holds no others (a fish after the night's end,
  // or one in the next season), the tile opens that outing; else the day's search, which counts as the tile does.
  const topDayTrip = topDay?.tripId && wholeFishByTrip.get(topDay.tripId) === topDay.count ? topDay.tripId : null;
  const released = book.catches.filter((entry) => entry.released).length;
  const hooks = hookTally(book);
  // Each kind's fish as its card counts them, for the day of its last one: which kinds have gone quiet.
  const kindFish = new Map<string, CatchEntry[]>();
  for (const entry of countedFish(book.catches)) {
    const key = entry.species.trim().toLowerCase();
    const list = kindFish.get(key);
    if (list) list.push(entry);
    else kindFish.set(key, [entry]);
  }
  const freshKinds = year ? new Set(seasonRecap(whole, year, today).newKinds.map((name) => name.trim().toLowerCase())) : null;
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

  const months = monthTally(book.catches, 13, monthOf);
  // This year's own numbers and the days out show with or without a fish: a first outing planned, or a blank one, still
  // has its goal to set and its days to mark. A past season picked above has its recap instead of the goal.
  const goalSection = !year || year === today.slice(0, 4) ? (
      <section>
        <div className="section-head">
          <h2>{t("This year's goal")}</h2>
        </div>
        {/* Drawn afresh at New Year, so the new year's count never meets last year's goal. */}
        <YearGoal key={today.slice(0, 4)} book={whole} openAtStart={params.get(GOAL_PARAM) === "set"} />
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
        {/* With this season picked, its recap below copies the year, goal and all: one Copy, not two. */}
        {!year && whole.catches.some((entry) => dayOf(entry).startsWith(`${today.slice(0, 4)}-`)) ? (
          <CopySummary text={() => seasonCopy(whole, today.slice(0, 4), today)} file="stillwater-year.txt" />
        ) : null}
      </section>
    ) : null;
  const calendarSection = dayMarks(whole, year ?? today.slice(0, 4)).size > 0 ? (
      <section>
        <div className="section-head">
          <h2>{t("Days out in {year}", { year: year ?? today.slice(0, 4) })}</h2>
        </div>
        <p className="meta">{t("A stronger shade means more fish; a thick outline was an outing with none, a thin one is an outing ahead.")}</p>
        <DayCalendar book={whole} year={year ?? today.slice(0, 4)} today={today} tail={tail} tripTail={(day) => tripDaySearch(all, day, new Set(whole.trips.map((trip) => trip.id)), t)} />
      </section>
    ) : null;

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

      {/* One season at a time, once the book spans more than one, or its one season is past: a January still reaches last season's recap. */}
      {years.length > 1 || (years.length === 1 && years[0] !== today.slice(0, 4)) ? (
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
      {year ? <SeasonRecapBox book={whole} year={year} today={today} dayLink={(date) => findLink(tail(date))} /> : null}

      <section className="stat-row" data-cols="4" aria-label={t("Personal bests")}>
        <div>
          <span className="eyebrow">{t("Longest")}</span>
          <strong>
            {/* Named whole for a list of links, where "20 in" alone says nothing. */}
            {bests.longest ? (
              <Link to={`/catches/${bests.longest.id}`} aria-label={t("Longest: {species}, {size}", { species: t(bests.longest.species), size: measureText(measureOf(bests.longest, "length")!) })}>
                {measureText(measureOf(bests.longest, "length")!)}
              </Link>
            ) : (
              t("None")
            )}
          </strong>
          <small>{bests.longest ? t(bests.longest.species) : t("No length in the book")}</small>
        </div>
        <div>
          <span className="eyebrow">{t("Heaviest")}</span>
          <strong>
            {bests.heaviest ? (
              <Link to={`/catches/${bests.heaviest.id}`} aria-label={t("Heaviest: {species}, {size}", { species: t(bests.heaviest.species), size: measureText(measureOf(bests.heaviest, "weight")!) })}>
                {measureText(measureOf(bests.heaviest, "weight")!)}
              </Link>
            ) : (
              t("None")
            )}
          </strong>
          <small>{bests.heaviest ? t(bests.heaviest.species) : t("No weight in the book")}</small>
        </div>
        <div>
          <span className="eyebrow">{t("Waters with fish")}</span>
          <strong>
            {/* To this page's own list of them, in the season picked: the Waters page would list every water. */}
            {bests.watersWithFish > 0 ? (
              <a
                href="#waters-with-fish"
                aria-label={t("Waters with fish: {count}", { count: bests.watersWithFish })}
                onClick={(event) => {
                  event.preventDefault();
                  const heading = document.getElementById("waters-with-fish");
                  heading?.scrollIntoView({ block: "start" });
                  heading?.focus({ preventScroll: true });
                }}
              >
                {bests.watersWithFish}
              </a>
            ) : (
              bests.watersWithFish
            )}
          </strong>
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
          {/* A day is already within one season: the season's word would leave out its small-hours fish. */}
          <Link to={findLink(tail(kindsDay.date))}>{t("Most kinds in one day: {count}, on {day}", { count: kindsDay.kinds, day: formatDay(kindsDay.date) })}</Link>
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
        <>
          {/* The tile above already says there is no fish: say why the sample week's are gone, when they are. */}
          {all.catches.some((entry) => isSampleCatch(entry.id)) ? <p className="empty">{t("The sample week is left out now that you have an outing of your own.")}</p> : null}
          {goalSection}
          {calendarSection}
        </>
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
                      {/* A kind the season brought into the book for the first time. */}
                      {freshKinds?.has(row.species.trim().toLowerCase()) ? <span className="stamp">{t("New this season")}</span> : null}
                    </div>
                    <p className="meta">
                      {fishCountLabel(row.count)}
                      {measures ? ` · ${measures}` : ""}
                    </p>
                    <KindLeaders book={book} species={row.species} />
                    {lastFishLine(whole, kindFish.get(row.species.trim().toLowerCase()) ?? [])}
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

          {goalSection}

          {calendarSection}

          {!year && fishYears.length > 1 ? (
            <section>
              <div className="section-head">
                <h2>{t("By year")}</h2>
              </div>
              {/* Each year opens the catch search for its fish. */}
              <TallyBars key={year ?? ""} rows={yearTally(book.catches, monthOf).map((row) => ({ key: row.year, label: row.year, count: row.count, to: findLink(tail(row.year)) }))} />
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

          {!year ? <MonthYearTable catches={book.catches} tail={tail} monthOf={monthOf} /> : null}

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
              <h2 id="waters-with-fish" tabIndex={-1}>
                {t("Waters with fish")}
              </h2>
            </div>
            <div className="card-grid">
              {bests.waters.map((water) => (
                <Link key={water.spotId} to={year ? linkFor(exactTerm("water", water.name)) : `/spots/${water.spotId}`} className="spot-card">
                  <div className="spot-card-top">
                    <h3>{water.name === "Unknown water" ? t(water.name) : water.name}</h3>
                  </div>
                  <p className="meta">{waterFishLine(bySpot.get(water.spotId) ?? [])}</p>
                  {/* When it last gave one: a water gone quiet is worth a visit, or a rest. */}
                  {lastFishLine(whole, bySpot.get(water.spotId) ?? [])}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
