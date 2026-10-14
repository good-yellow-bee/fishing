import { Link } from "react-router-dom";
import { localDate, recentCatches, recentTrips, shiftDate, spotById, tripById, upcomingTrips, catchesForTrip } from "@stillwater/shared";
import { BookFile } from "./BookFile";
import { CatchSearch } from "./CatchSearch";
import { CatchCard, TripCard } from "./cards";
import { formatLongDay } from "./format";
import { useLogbook } from "./LogbookState";
import { t, useT } from "../i18n";

function deskLine(now: Date): string {
  const hour = now.getHours();
  if (hour < 11) return t("Write it down before the coffee gets cold.");
  if (hour < 17) return t("If it bent the rod, it belongs in the book.");
  return t("Get the lure and the hour on paper before both slip.");
}

export function HomePage() {
  const { book } = useLogbook();
  useT();
  const now = new Date();
  const today = localDate(now);
  const tomorrow = shiftDate(now, 1);
  const catches = recentCatches(book, 4);
  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today, 3);
  const next = upcoming[0];
  const nextSpot = next ? spotById(book, next.spotId) : undefined;

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{formatLongDay(now)}</p>
          <h1>{t("The book")}</h1>
          <p className="lede">{deskLine(now)}</p>
        </div>
      </header>

      <section className="stat-row" aria-label={t("This book")}>
        <div>
          <span className="eyebrow">{t("Fish")}</span>
          <strong>{book.catches.length}</strong>
        </div>
        <div>
          <span className="eyebrow">{t("Waters")}</span>
          <strong>{book.spots.length}</strong>
        </div>
        <div>
          <span className="eyebrow">{t("Next")}</span>
          <strong>{next ? next.title : t("None planned")}</strong>
          <small>{nextSpot ? nextSpot.name : t("Add an outing when you know the day")}</small>
        </div>
      </section>

      <CatchSearch />

      <div className="home-grid">
        <section>
          <div className="section-head">
            <h2>{t("Recent fish")}</h2>
            <Link to="/catches">{t("All catches")}</Link>
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
