import { Link } from "react-router-dom";
import { localDate, recentCatches, recentTrips, shiftDate, spotById, tripById, upcomingTrips, catchesForTrip } from "@stillwater/shared";
import { BookFile } from "./BookFile";
import { CatchSearch } from "./CatchSearch";
import { CatchCard, TripCard } from "./cards";
import { formatLongDay, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { readKeptDraft } from "./catchDraft";
import { t, tn, useT } from "../i18n";
import { speciesCounts } from "./speciesLink";
import { findLink } from "./CatchSearch";
import { catchMonth, monthName } from "./tripMonths";
import { thisWeekInPastYears } from "./yearsAgo";

function deskLine(now: Date): string {
  const hour = now.getHours();
  if (hour < 11) return t("Write it down before the coffee gets cold.");
  if (hour < 17) return t("If it bent the rod, it belongs in the book.");
  return t("Get the lure and the hour on paper before both slip.");
}

export function HomePage() {
  const { book, photos } = useLogbook();
  const photoCount = book.catches.filter((entry) => photos[entry.id]).length;
  useT();
  const now = new Date();
  const today = localDate(now);
  const tomorrow = shiftDate(now, 1);
  const catches = recentCatches(book, 4);
  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today, 3);
  const kinds = speciesCounts(book.catches).length;
  // A look back: what came out of the water this same week in earlier years.
  const yearsAgo = thisWeekInPastYears(book.catches, now);
  const thisMonth = today.slice(0, 7);
  const monthFish = book.catches.filter((entry) => catchMonth(entry) === thisMonth).length;
  const next = upcoming[0];
  const nextSpot = next ? spotById(book, next.spotId) : undefined;
  // A fish started on the catch form and never saved: the first thing worth finishing.
  const kept = readKeptDraft(now);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{formatLongDay(now)}</p>
          <h1>{t("The book")}</h1>
          <p className="lede">{deskLine(now)}</p>
        </div>
      </header>

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
              {tn(kinds, "{n} species", "{n} species")}
              {monthFish > 0 ? (
                <>
                  {" · "}
                  {/* This month's fish, through the catch search. */}
                  <Link to={findLink(monthName(thisMonth))}>{t("{n} this month", { n: monthFish })}</Link>
                </>
              ) : null}
            </small>
          ) : null}
        </div>
        <div>
          <span className="eyebrow">{t("Waters")}</span>
          <strong>
            <Link to="/spots">{book.spots.length}</Link>
          </strong>
          {book.trips.length > 0 ? <small>{tn(book.trips.length, "{n} outing", "{n} outings")}</small> : null}
        </div>
        <div>
          <span className="eyebrow">{t("Next")}</span>
          <strong>{next ? <Link to={`/trips/${next.id}`}>{next.title}</Link> : t("None planned")}</strong>
          <small>
            {next
              ? [tripWhen(next.date, today, tomorrow), nextSpot?.name].filter(Boolean).join(" · ")
              : t("Add an outing when you know the day")}
          </small>
        </div>
      </section>

      <CatchSearch />

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
                    <p className="meta">{tn(now.getFullYear() - new Date(entry.caughtAt).getFullYear(), "{n} year ago", "{n} years ago")}</p>
                    <CatchCard
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
            <p className="empty">{t("Nothing on the calendar.")}</p>
          ) : (
            <div className="stack">
              {upcoming.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  spotName={spotById(book, trip.spotId)?.name ?? t("Unknown water")}
                  waterType={spotById(book, trip.spotId)?.waterType ?? null}
                  fishCount={catchesForTrip(book, trip.id).length}
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
                  key={trip.id}
                  trip={trip}
                  spotName={spotById(book, trip.spotId)?.name ?? t("Unknown water")}
                  waterType={spotById(book, trip.spotId)?.waterType ?? null}
                  fishCount={catchesForTrip(book, trip.id).length}
                  today={today}
                  tomorrow={tomorrow}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <BookFile />
    </div>
  );
}
