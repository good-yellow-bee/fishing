import { Fragment, useRef, useState, type ReactNode } from "react";
import { MapAnchor } from "./MapAnchor";
import { Link } from "react-router-dom";
import { MOON_QUARTER_LABELS, catchesForTrip, fishCountsByTrip, itemsForTrip, localDate, lureTally, moonQuarterOf, packedCount, recentCatches, recentTrips, shiftDate, spotById, type Logbook, type Spot, type Trip } from "@stillwater/shared";
import { BookFile, SET_ASIDE_ID } from "./BookFile";
import { readUnreadableBook } from "./storage";
import { CatchSearch } from "./CatchSearch";
import { CatchCard, TripCard } from "./cards";
import { fishCountLabel, formatDay, formatLongDay, formatTimeOfDay, outingName, outingNameById, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { countedSearch } from "./countedSearch";
import { RESUME_PARAM } from "./anotherCatch";
import { hasSampleLeft, isSampleCatch, isSampleOnly, isSampleSpot, isSampleOuting, upcomingRealTrips, withoutSample } from "./bookCopy";
import { NEWS_ITEMS, markNewsSeen, newsDue, readSeenNews } from "../game/whatsNew";
import { readKeptDraft } from "./catchDraft";
import { t, tn, useT } from "../i18n";
import { daysBetween } from "./spotOrder";
import { speciesCounts } from "./speciesLink";
import { findLink } from "./CatchSearch";
import { bookFishDay, daysOut } from "./tripMonths";
import { countedBook, countedFish, nextBookMark, ownFish } from "./milestones";
import { FROM_LIST } from "./leaveDeleted";
import { thisWeekInPastYears, yearsBack } from "./yearsAgo";
import { GOAL_PARAM, goalPace, readYearGoal } from "./YearGoal";
import { ThemeChoice } from "./ThemeChoice";
import { sunTimes } from "./sunTimes";
import { placeFor } from "./map/places";
import { useTackleItems } from "./gear/TackleState";
import { PLAY_LAKE_ID, offPlayLake, withoutPlayLake } from "./playLake";
import { LATE_NIGHT_UNTIL } from "./suggestions";

function deskLine(now: Date): string {
  const hour = now.getHours();
  if (hour < 11) return t("Write it down before the coffee gets cold.");
  if (hour < 17) return t("If it bent the rod, it belongs in the book.");
  return t("Get the lure and the hour on paper before both slip.");
}

/** For an outing today or tomorrow: when the sun next rises (or, once it is up today, sets) at the water, and how much of the bag is packed. */
function NextDayLine({ trip, spot, today, now }: { trip: Trip; spot: Spot | undefined; today: string; now: Date }) {
  const items = useTackleItems();
  const parts: ReactNode[] = [];
  // The sample's made-up waters sit far away: their sunrise read on this device's clock would mislead.
  const place = spot && !isSampleSpot(spot.id) ? (spot.place ?? placeFor(spot.id)) : undefined;
  if (place) {
    const sun = sunTimes(trip.date, place.lat, place.lng);
    if ("rise" in sun) {
      parts.push(
        trip.date === today && sun.rise <= now
          ? sun.set > now
            ? t("Sunset {time}", { time: formatTimeOfDay(sun.set.toISOString()) })
            : null
          : t("Sunrise {time}", { time: formatTimeOfDay(sun.rise.toISOString()) }),
      );
    }
  }
  // The moon's week, when it is near full or new: the nights it changes the bite.
  const moon = moonQuarterOf(new Date(`${trip.date}T12:00:00`));
  if (moon === "full" || moon === "new") parts.push(t(MOON_QUARTER_LABELS[moon]));
  const rows = items ? itemsForTrip(items, trip.id) : [];
  if (rows.length > 0) {
    const packed = packedCount(rows);
    parts.push(
      // To the outing, where its list is: what is still to go in the bag.
      <Link key="packed" to={`/trips/${trip.id}`}>
        {packed === rows.length ? t("All packed") : t("{n} left to pack", { n: rows.length - packed })}
      </Link>,
    );
  }
  const shown = parts.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <small className="next-day">
      {shown.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? " · " : null}
          {part}
        </Fragment>
      ))}
    </small>
  );
}

/** How the last outing on the next outing's water went: its fish and the lure that took the most, to plan by. */
function LastTimeLine({ book, trip, today }: { book: Logbook; trip: Trip; today: string }) {
  // The outings as the outing's own page reads them: the sample week's made-up ones left out once the book has the angler's own.
  const last = countedBook(book).trips.filter((other) => other.spotId === trip.spotId)
    // Today's outing only once it has given a fish: one still to happen says nothing yet.
    .filter((other) => other.id !== trip.id && other.date < trip.date && (other.date < today || (other.date === today && catchesForTrip(book, other.id).length > 0)))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return null;
  const fish = catchesForTrip(book, last.id);
  const lure = lureTally({ ...book, catches: fish }, 1)[0];
  // How long the water has rested, as the outing's own page says it: during a night session, to the outing's own day.
  const rest = daysBetween(last.date, trip.date < today ? trip.date : today);
  const day = rest >= 2 ? `${formatDay(last.date)} · ${tn(rest, "{n} day ago", "{n} days ago")}` : formatDay(last.date);
  return (
    <small className="next-last">
      <Link to={`/trips/${last.id}`} state={FROM_LIST}>
        {lure
          ? t("Last time: {day} · {fish} · {lure}", { day, fish: fishCountLabel(fish.length), lure: `${t(lure.lure)} ×${lure.count}` })
          : t("Last time: {day} · {fish}", { day, fish: fishCountLabel(fish.length) })}
      </Link>
    </small>
  );
}

/** As many of the newest items as the game's card shows. */
const NEWS_SHOWN = 4;

export function HomePage() {
  const { book, storedBook, photos, startBlank, dropSample } = useLogbook();
  const heading = useRef<HTMLHeadingElement>(null);
  const [setAside, setSetAside] = useState(() => readUnreadableBook() !== null);
  // The news the game's dock shows, here too for an angler who only keeps the book: decided once per visit.
  const [news, setNews] = useState(() => newsDue(storedBook.catches.filter((entry) => offPlayLake(entry) && !isSampleCatch(entry.id)).length, readSeenNews()));
  // A first visit: the invented sample and nothing of the player's own yet.
  const sampleOnly = isSampleOnly(storedBook);
  // Every pictured fish, the game's snapshots too: the photo wall it opens shows them all.
  const photoCount = book.catches.filter((entry) => photos[entry.id]).length;
  useT();
  const now = new Date();
  const today = localDate(now);
  const tomorrow = shiftDate(now, 1);
  // The angler's own: a round of the game fills none of these cards.
  const catches = recentCatches({ ...book, catches: book.catches.filter(offPlayLake) }, 4);
  // In the small hours, last evening's outing is still the one out on the water: it stays first, with its log link.
  // Not when today has an outing of its own, nor yesterday's morning outing: only one still going, with no fish yet or
  // one in the last twelve hours.
  // The angler's own outing today: a sample one dated today doesn't end last night's session.
  const todayOuting = upcomingRealTrips(book, today).some((trip) => offPlayLake(trip) && trip.date === today);
  const lateOuting =
    now.getHours() < LATE_NIGHT_UNTIL && !todayOuting
      ? book.trips.find((trip) => {
          if (!offPlayLake(trip) || isSampleOuting(trip) || trip.date !== shiftDate(now, -1)) return false;
          const fish = catchesForTrip(book, trip.id);
          return fish.length === 0 || fish.some((entry) => now.getTime() - Date.parse(entry.caughtAt) < 12 * 3_600_000);
        })
      : undefined;
  const upcoming = [...(lateOuting ? [lateOuting] : []), ...upcomingRealTrips(book, today)];
  // Just back from the water, not from a round of the game.
  // Last evening's outing still on the water shows once, among what's coming up.
  const recent = recentTrips({ ...book, trips: book.trips.filter((trip) => offPlayLake(trip) && trip.id !== lateOuting?.id) }, today, 3);
  // Counted once for every card, not by sorting the whole book once per outing.
  const fishByTrip = fishCountsByTrip(book);
  const nextMark = nextBookMark(book.catches.filter(ownFish).length);
  // Waters and outings of the angler's own, as Bests counts them: not the game's lake or its days.
  // The sample week's waters, outings and fish go once the angler has an outing or a fish of their own.
  const countedOwn = countedBook(book);
  // The counts are the angler's own, as Bests and the goal count them: a round of the game moves none of them, and a
  // first outing of their own already leaves the sample week's fish out.
  const real = countedOwn.catches;
  // The month, the year and the goal count as Bests does: a planned outing of their own already leaves the sample's fish out.
  const counted = new Set(countedOwn.catches.map((entry) => entry.id));
  const kinds = speciesCounts(real).length;
  // A look back: what came out of the water this same week in earlier years.
  const yearsAgo = thisWeekInPastYears(real, now);
  const thisMonth = today.slice(0, 7);
  // By the outing's day, as the year below: a New Year's Eve night's small hours are December's, not January's.
  const monthRows = book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${thisMonth}-`));
  const monthFish = monthRows.filter((entry) => counted.has(entry.id)).length;
  const thisYear = today.slice(0, 4);
  // The goal counts a night session's small hours on its outing's day, as Bests does.
  const yearRows = book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${thisYear}-`));
  const yearFish = yearRows.filter((entry) => counted.has(entry.id)).length;
  // The goal is the angler's own: the sample week's invented fish don't fill it, so a book of only those shows none.
  const goal = sampleOnly ? null : readYearGoal(thisYear);
  const pace = goal !== null ? goalPace(yearFish, goal, now) : null;
  // Last year up to this same date, once last year has any fish: is this year on pace?
  const lastYear = String(Number(thisYear) - 1);
  // A night session's small hours on its outing's day, as the calendar counts it.
  const lastYearDays = real.map((entry) => bookFishDay(book, entry)).filter((day) => day.startsWith(`${lastYear}-`));
  const lastYearByNow = lastYearDays.filter((day) => day.slice(5) <= today.slice(5)).length;
  // "0 by this date last year" says nothing when the book only starts after that date.
  const firstDay = real.reduce((first, entry) => (bookFishDay(book, entry) < first ? bookFishDay(book, entry) : first), "9999");
  const comparable = lastYearDays.length > 0 && firstDay <= `${lastYear}-${today.slice(5)}`;
  // Early January: how last year's goal ended, before the new year's count says much.
  const lastGoal = today.slice(5) <= "01-14" ? readYearGoal(lastYear) : null;
  const ownAny = countedOwn.trips.some((trip) => !isSampleOuting(trip)) || countedOwn.catches.some((entry) => !isSampleCatch(entry.id));
  const ownWaters = (ownAny ? withoutSample(book) : book).spots.filter((spot) => spot.id !== PLAY_LAKE_ID).length;
  // Today's outing counts once it has a fish, as the averages take it.
  const daysThisYear = daysOut(countedOwn, thisYear, today);
  // The outings search that lists the ones counted: without the sample week's once they are left out, and the game's.
  const leftOut = [
    book.trips.some((trip) => isSampleOuting(trip) && !countedOwn.trips.includes(trip)) ? `-${t("sample|search word")}` : "",
    book.trips.some((trip) => !offPlayLake(trip)) ? `-${t("game|search word")}` : "",
  ].filter(Boolean);
  const outingsLink = leftOut.length > 0 ? `/trips?${new URLSearchParams({ find: leftOut.join(" ") }).toString()}` : "/trips";
  const ownOutings = countedOwn.trips.filter((trip) => trip.date < today || (trip.date === today && (fishByTrip.get(trip.id) ?? 0) > 0)).length;
  // Fish of their own logged beside the sample week: the invented part can go on its own.
  const sampleLeft = !sampleOnly && hasSampleLeft(storedBook);
  const next = upcoming[0];
  const nextSpot = next ? spotById(book, next.spotId) : undefined;
  // A fish started on the catch form and never saved: the first thing worth finishing.
  const kept = readKeptDraft(now);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{formatLongDay(now)}</p>
          <h1 ref={heading} tabIndex={-1}>
            {t("The book")}
          </h1>
          <p className="lede">{deskLine(now)}</p>
        </div>
      </header>

      {sampleOnly ? (
        <aside className="conditions sample-start" aria-label={t("Sample book")}>
          <span className="eyebrow">{t("Sample book")}</span>
          <p>{t("These waters, outings and fish are invented, so you can look around. Start your own book when you're ready.")}</p>
          <button type="button" className="field-primary inline" onClick={() => {
              // The button goes with the sample, so focus moves to the top of the page.
              if (startBlank()) heading.current?.focus();
            }}>
            {t("Start my own book")}
          </button>
        </aside>
      ) : null}

      {sampleLeft ? (
        <aside className="conditions sample-start" aria-label={t("Sample book")}>
          <span className="eyebrow">{t("Sample book")}</span>
          <p>{t("The sample week's invented entries are still in this book, beside your own.")}</p>
          <button type="button" className="field-primary inline" onClick={() => {
              if (dropSample()) heading.current?.focus();
            }}>
            {t("Remove the sample week")}
          </button>
        </aside>
      ) : null}

      {news ? (
        <aside className="conditions sample-start" aria-labelledby="field-news">
          <span className="eyebrow" id="field-news">
            {t("What's new")}
          </span>
          <ul className="field-news">
            {NEWS_ITEMS.slice(0, NEWS_SHOWN).map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>
          <button type="button" className="text-button" onClick={() => {
              markNewsSeen();
              setNews(false);
              heading.current?.focus();
            }}>
            {t("Got it")}
          </button>
        </aside>
      ) : null}

      {kept ? (
        <div className="kept-draft" role="status">
          <p>
            {kept.species.trim()
              ? t("A fish you started logging was not saved: {species}.", { species: t(kept.species.trim()) })
              : t("A fish you started logging was not saved.")}
          </p>
          <Link to={`/catches/new?${RESUME_PARAM}=1`} className="field-primary inline">
            {t("Pick it up")}
          </Link>
        </div>
      ) : null}

      {/* The set-aside notice sits low on the page, with the book's file: a line up here says it is there. */}
      {setAside ? (
        <p className="copy-nudge">
          <a
            href={`#${SET_ASIDE_ID}`}
            onClick={(event) => {
              event.preventDefault();
              const notice = document.getElementById(SET_ASIDE_ID);
              notice?.scrollIntoView({ block: "center" });
              notice?.focus({ preventScroll: true });
            }}
          >
            {t("A book that could not be read was set aside. See what to do with it")}
          </a>
        </p>
      ) : null}

      <section className="stat-row" aria-label={t("This book")}>
        <div>
          <span className="eyebrow">{t("Fish")}</span>
          <strong>
            {/* The angler's own: game fish are left out of the count and of the list it opens. */}
            <Link to={real.length < book.catches.length ? `/catches?${new URLSearchParams({ find: countedSearch(book, "", book.catches, "book").trim() }).toString()}` : "/catches"} aria-label={fishCountLabel(real.length)}>{real.length}</Link>
          </strong>
          {/* Only the game's fish so far: no kinds or months of the angler's own to give. */}
          {real.length > 0 ? (
            <small>
              <Link to="/bests">{tn(kinds, "{n} species", "{n} species")}</Link>
              {monthFish > 0 ? (
                <>
                  {" · "}
                  {/* This month's fish, through the catch search, which reads "this month" by the outing's day as counted here. */}
                  <Link to={findLink(countedSearch(book, t("this month|search word"), monthRows, "book"))}>{t("{n} this month", { n: monthFish })}</Link>
                </>
              ) : null}
              {yearFish > monthFish || goal !== null ? (
                <>
                  {" · "}
                  {/* And this year's, once the year holds more than the month, against the year's goal when there is one. */}
                  <Link to={findLink(countedSearch(book, t("this year|search word"), yearRows, "book"))}>{goal === null ? t("{n} this year", { n: yearFish }) : yearFish >= goal ? t("Goal reached: {n} of {goal}", { n: yearFish, goal }) : t("{n} of {goal} this year", { n: yearFish, goal })}</Link>
                </>
              ) : null}
              {/* A year with fish but no goal yet: one tap to Bests with the goal's form open. */}
              {goal === null && yearFish > 0 && !sampleOnly ? (
                <>
                  {" · "}
                  <Link to={`/bests?${GOAL_PARAM}=set`}>{t("Set a goal for {year}", { year: thisYear })}</Link>
                </>
              ) : null}
              {lastGoal !== null ? (
                <>
                  {" · "}
                  <Link to={`/bests?year=${lastYear}`}>{lastYearDays.length >= lastGoal ? t("{year}: goal reached, {n} of {goal}", { year: lastYear, n: lastYearDays.length, goal: lastGoal }) : t("{year}: {n} of {goal}", { year: lastYear, n: lastYearDays.length, goal: lastGoal })}</Link>
                </>
              ) : null}
              {comparable ? `\u00a0· ${t("{n} by this date last year", { n: lastYearByNow })}` : null}
              {/* Where this year's pace ends it, against the goal, as the goal on Bests says it. */}
              {pace ? `\u00a0· ${t("on pace for {n}", { n: pace.pace })}` : null}
              {/* A round number a few fish off: the next one worth a cheer. */}
              {nextMark ? `\u00a0· ${t("{n} more to {mark}", { n: nextMark.left, mark: nextMark.mark })}` : null}
            </small>
          ) : null}
        </div>
        <div>
          <span className="eyebrow">{t("Waters")}</span>
          <strong>
            <Link to="/spots" aria-label={tn(ownWaters, "{n} water", "{n} waters")}>{ownWaters}</Link>
          </strong>
          {ownOutings > 0 ? (
            <small>
              {/* Every year's, beside this year's days: said so, and opening those outings, not the sample week's or the game's. */}
              <Link to={outingsLink}>{tn(ownOutings, "{n} outing in all", "{n} outings in all")}</Link>
              {/* Days on the water this year, as Bests counts them: a night's small hours on its outing's day. */}
              {daysThisYear > 0 ? (
                <>
                  {" · "}
                  <Link to="/bests">{tn(daysThisYear, "{n} day out this year", "{n} days out this year")}</Link>
                </>
              ) : null}
            </small>
          ) : null}
        </div>
        <div>
          <span className="eyebrow">{t("Next")}</span>
          <strong>{next ? <Link to={`/trips/${next.id}`} state={FROM_LIST}>{outingName(next, book.spots)}</Link> : t("None planned")}</strong>
          <small>
            {next ? (
              <>
                {tripWhen(next.date, today, tomorrow)}
                {/* The water opens too, for what works there; an untitled outing already goes by its name above, so not again. */}
                {nextSpot ? (
                  <>
                    {" · "}
                    {outingName(next, book.spots) !== nextSpot.name ? (
                      <Link to={`/spots/${nextSpot.id}`}>{nextSpot.name}</Link>
                    ) : (
                      <Link to={`/spots/${nextSpot.id}`} aria-label={t("{water}: water page", { water: nextSpot.name })}>
                        {t("Water page")}
                      </Link>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              t("Add an outing when you know the day")
            )}
            {next && nextSpot?.place ? (
              <span className="map-link">
                {" · "}
                <MapAnchor lat={nextSpot.place.lat} lng={nextSpot.place.lng}>
                  {t("Open on a map")}
                </MapAnchor>
              </span>
            ) : null}
          </small>
          {next && next !== lateOuting && next.date <= tomorrow ? <NextDayLine trip={next} spot={nextSpot} today={today} now={now} /> : null}
          {next ? <LastTimeLine book={book} trip={next} today={today} /> : null}
          {/* On the day, a fish goes straight onto this outing. */}
          {next && (next.date === today || next === lateOuting) ? (
            <small className="next-log">
              <Link to={`/catches/new?trip=${next.id}&spot=${next.spotId}`}>{t("Log a catch")}</Link>
            </small>
          ) : null}
        </div>
      </section>

      {/* Nothing to find in a book with no fish of the angler's own yet; the game's stay findable on the catch log. */}
      {countedFish(book.catches).length > 0 ? <CatchSearch /> : null}

      <div className="home-grid">
        <section>
          <div className="section-head">
            <h2>{t("Recent fish")}</h2>
            <span className="section-links">
              {photoCount > 0 ? <Link to="/photos">{t("Photos ({count})", { count: photoCount })}</Link> : null}
              <Link to="/catches">{t("All catches")}</Link>
            </span>
          </div>
          {catches.length === 0 ? (
            <p className="empty">{t("The book is blank. Log the first fish before the details fade.")}</p>
          ) : (
            <div className="stack">
              {catches.map((entry) => (
                <CatchCard
                  key={entry.id}
                  entry={entry}
                  spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                  tripTitle={entry.tripId ? outingNameById(book, entry.tripId) : null}
                />
              ))}
            </div>
          )}
          {yearsAgo.length > 0 ? (
            <>
              <h3 className="subhead">{t("This week in years past")}</h3>
              <div className="stack">
                {yearsAgo.map((entry) => (
                  <div key={entry.id} className="years-ago">
                    {/* Say plainly how long ago, beside the date on the card. */}
                    <p className="meta">
                      {tn(yearsBack(entry, now) ?? 1, "{n} year ago", "{n} years ago")}
                      {" · "}
                      {/* The whole day it came from, in the catch search. */}
                      <Link to={findLink(withoutPlayLake(book, bookFishDay(book, entry), book.catches))}>{t("Every fish that day")}</Link>
                    </p>
                    <CatchCard
                      level={4}
                      entry={entry}
                      spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                      tripTitle={entry.tripId ? outingNameById(book, entry.tripId) : null}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section>
          <div className="section-head">
            <h2>{t("Outings")}</h2>
            <Link to="/trips">{t("All trips")}</Link>
          </div>
          <h3 className="subhead">{t("Coming up")}</h3>
          {upcoming.length === 0 ? (
            <p className="empty">
          {t("Nothing on the calendar.")} <Link to="/trips/new">{t("Plan one")}</Link>
        </p>
          ) : (
            <div className="stack">
              {upcoming.map((trip) => (
                <TripCard
                  level={4}
                  key={trip.id}
                  trip={trip}
                  spotName={spotById(book, trip.spotId)?.name ?? t("Unknown water")}
                  waterType={spotById(book, trip.spotId)?.waterType ?? null}
                  fishCount={fishByTrip.get(trip.id) ?? 0}
                  today={today}
                  tomorrow={tomorrow}
                />
              ))}
            </div>
          )}
          <h3 className="subhead">{t("Just back")}</h3>
          {recent.length === 0 ? (
            <p className="empty">{t("No past outings yet.")}</p>
          ) : (
            <div className="stack">
              {recent.map((trip) => (
                <TripCard
                  level={4}
                  key={trip.id}
                  trip={trip}
                  spotName={spotById(book, trip.spotId)?.name ?? t("Unknown water")}
                  waterType={spotById(book, trip.spotId)?.waterType ?? null}
                  fishCount={fishByTrip.get(trip.id) ?? 0}
                  today={today}
                  tomorrow={tomorrow}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* The news again, after Got it here or on the dock. */}
      {news ? null : (
        <p className="meta">
          <button type="button" className="text-button" onClick={() => {
              setNews(true);
              // The card opens at the top of the page: the heading above it is where reading starts again.
              heading.current?.focus();
            }}>
            {t("What's new")}
          </button>
        </p>
      )}
      <BookFile onSetAsideGone={() => setSetAside(false)} />
      <ThemeChoice />
    </div>
  );
}
