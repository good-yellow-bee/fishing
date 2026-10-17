import { Fragment, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fishCountsByTrip, itemsForTrip, localDate, packedCount, recentCatches, recentTrips, shiftDate, spotById, tripById, upcomingTrips, type Spot, type Trip } from "@stillwater/shared";
import { BookFile } from "./BookFile";
import { CatchSearch } from "./CatchSearch";
import { CatchCard, TripCard } from "./cards";
import { formatLongDay, formatTimeOfDay, outingName, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { isSampleOnly } from "./bookCopy";
import { readKeptDraft } from "./catchDraft";
import { t, tn, useT } from "../i18n";
import { speciesCounts } from "./speciesLink";
import { findLink } from "./CatchSearch";
import { catchMonth } from "./tripMonths";
import { thisWeekInPastYears, yearsBack } from "./yearsAgo";
import { readYearGoal } from "./YearGoal";
import { ThemeChoice } from "./ThemeChoice";
import { osmLink } from "./osmLink";
import { sunTimes } from "./sunTimes";
import { placeFor } from "./map/places";
import { useTackleItems } from "./gear/TackleState";

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
  const place = spot ? (spot.place ?? placeFor(spot.id)) : undefined;
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
  const rows = items ? itemsForTrip(items, trip.id) : [];
  if (rows.length > 0) {
    const packed = packedCount(rows);
    parts.push(
      <Link key="packed" to="/gear">
        {packed === rows.length ? t("All packed") : t("{packed} of {total} packed", { packed, total: rows.length })}
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

export function HomePage() {
  const { book, storedBook, photos, startBlank } = useLogbook();
  const heading = useRef<HTMLHeadingElement>(null);
  // A first visit: the invented sample and nothing of the player's own yet.
  const sampleOnly = isSampleOnly(storedBook);
  const photoCount = book.catches.filter((entry) => photos[entry.id]).length;
  useT();
  const now = new Date();
  const today = localDate(now);
  const tomorrow = shiftDate(now, 1);
  const catches = recentCatches(book, 4);
  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today, 3);
  // Counted once for every card, not by sorting the whole book once per outing.
  const fishByTrip = fishCountsByTrip(book);
  const kinds = speciesCounts(book.catches).length;
  // A look back: what came out of the water this same week in earlier years.
  const yearsAgo = thisWeekInPastYears(book.catches, now);
  const thisMonth = today.slice(0, 7);
  const monthFish = book.catches.filter((entry) => catchMonth(entry) === thisMonth).length;
  const thisYear = today.slice(0, 4);
  const yearFish = book.catches.filter((entry) => catchMonth(entry).startsWith(`${thisYear}-`)).length;
  const goal = readYearGoal(thisYear);
  // Last year up to this same date, once last year has any fish: is this year on pace?
  const lastYear = String(Number(thisYear) - 1);
  const lastYearDays = book.catches.map((entry) => localDate(new Date(entry.caughtAt))).filter((day) => day.startsWith(`${lastYear}-`));
  const lastYearByNow = lastYearDays.filter((day) => day.slice(5) <= today.slice(5)).length;
  // "0 by this date last year" says nothing when the book only starts after that date.
  const firstDay = book.catches.reduce((first, entry) => (entry.caughtAt < first ? entry.caughtAt : first), "9999");
  const comparable = lastYearDays.length > 0 && localDate(new Date(firstDay)) <= `${lastYear}-${today.slice(5)}`;
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

      {kept ? (
        <div className="kept-draft" role="status">
          <p>
            {kept.species.trim()
              ? t("A fish you started logging was not saved: {species}.", { species: kept.species.trim() })
              : t("A fish you started logging was not saved.")}
          </p>
          <Link to="/catches/new" className="field-primary inline">
            {t("Pick it up")}
          </Link>
        </div>
      ) : null}

      <section className="stat-row" aria-label={t("This book")}>
        <div>
          <span className="eyebrow">{t("Fish")}</span>
          <strong>
            <Link to="/catches">{book.catches.length}</Link>
          </strong>
          {book.catches.length > 0 ? (
            <small>
              <Link to="/bests">{tn(kinds, "{n} species", "{n} species")}</Link>
              {monthFish > 0 ? (
                <>
                  {" · "}
                  {/* This month's fish, through the catch search. */}
                  <Link to={findLink(thisMonth)}>{t("{n} this month", { n: monthFish })}</Link>
                </>
              ) : null}
              {yearFish > monthFish || goal !== null ? (
                <>
                  {" · "}
                  {/* And this year's, once the year holds more than the month, against the year's goal when there is one. */}
                  <Link to={findLink(thisYear)}>{goal !== null ? t("{n} of {goal} this year", { n: yearFish, goal }) : t("{n} this year", { n: yearFish })}</Link>
                </>
              ) : null}
              {comparable ? `\u00a0· ${t("{n} by this date last year", { n: lastYearByNow })}` : null}
            </small>
          ) : null}
        </div>
        <div>
          <span className="eyebrow">{t("Waters")}</span>
          <strong>
            <Link to="/spots">{book.spots.length}</Link>
          </strong>
          {book.trips.length > 0 ? (
            <small>
              <Link to="/trips">{tn(book.trips.length, "{n} outing", "{n} outings")}</Link>
            </small>
          ) : null}
        </div>
        <div>
          <span className="eyebrow">{t("Next")}</span>
          <strong>{next ? <Link to={`/trips/${next.id}`}>{outingName(next)}</Link> : t("None planned")}</strong>
          <small>
            {next
              ? [tripWhen(next.date, today, tomorrow), nextSpot?.name].filter(Boolean).join(" · ")
              : t("Add an outing when you know the day")}
            {next && nextSpot?.place ? (
              <span className="map-link">
                {" · "}
                <a href={osmLink(nextSpot.place.lat, nextSpot.place.lng)} target="_blank" rel="noreferrer">
                  {t("Open on a map")}
                </a>
              </span>
            ) : null}
          </small>
          {next && next.date <= tomorrow ? <NextDayLine trip={next} spot={nextSpot} today={today} now={now} /> : null}
        </div>
      </section>

      {/* Nothing to find in a book with no fish yet. */}
      {book.catches.length > 0 ? <CatchSearch /> : null}

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
                  tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
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
                      <Link to={findLink(localDate(new Date(entry.caughtAt)))}>{t("Every fish that day")}</Link>
                    </p>
                    <CatchCard
                      level={4}
                      entry={entry}
                      spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                      tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
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

      <BookFile />
      <ThemeChoice />
    </div>
  );
}
