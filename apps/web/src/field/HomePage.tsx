import { Link } from "react-router-dom";
import { localDate, recentCatches, recentTrips, shiftDate, spotById, tripById, upcomingTrips, catchesForTrip } from "@stillwater/shared";
import { CatchCard, TripCard } from "./cards";
import { formatLongDay } from "./format";
import { useLogbook } from "./LogbookState";

function deskLine(now: Date): string {
  const hour = now.getHours();
  if (hour < 11) return "Write it down before the coffee gets cold.";
  if (hour < 17) return "If it bent the rod, it belongs in the book.";
  return "Get the lure and the hour on paper before both slip.";
}

export function HomePage() {
  const { book, restoreSample } = useLogbook();
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
          <h1>The book</h1>
          <p className="lede">{deskLine(now)}</p>
        </div>
      </header>

      <section className="stat-row" aria-label="This book">
        <div>
          <span className="eyebrow">Fish</span>
          <strong>{book.catches.length}</strong>
        </div>
        <div>
          <span className="eyebrow">Waters</span>
          <strong>{book.spots.length}</strong>
        </div>
        <div>
          <span className="eyebrow">Next</span>
          <strong>{next ? next.title : "None planned"}</strong>
          <small>{nextSpot ? nextSpot.name : "Add an outing when you know the day"}</small>
        </div>
      </section>

      <div className="home-grid">
        <section>
          <div className="section-head">
            <h2>Recent fish</h2>
            <Link to="/catches">All catches</Link>
          </div>
          {catches.length === 0 ? (
            <p className="empty">The book is blank. Log the first fish before the details fade.</p>
          ) : (
            <div className="stack">
              {catches.map((entry) => (
                <CatchCard
                  key={entry.id}
                  entry={entry}
                  spotName={spotById(book, entry.spotId)?.name ?? "Unknown water"}
                  tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Outings</h2>
            <Link to="/trips">All trips</Link>
          </div>
          <h3 className="subhead">Coming up</h3>
          {upcoming.length === 0 ? (
            <p className="empty">Nothing on the calendar.</p>
          ) : (
            <div className="stack">
              {upcoming.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  spotName={spotById(book, trip.spotId)?.name ?? "Unknown water"}
                  waterType={spotById(book, trip.spotId)?.waterType ?? null}
                  fishCount={catchesForTrip(book, trip.id).length}
                  today={today}
                  tomorrow={tomorrow}
                />
              ))}
            </div>
          )}
          <h3 className="subhead">Just back</h3>
          {recent.length === 0 ? (
            <p className="empty">No past outings yet.</p>
          ) : (
            <div className="stack">
              {recent.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  spotName={spotById(book, trip.spotId)?.name ?? "Unknown water"}
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

      <footer className="sheet-foot">
        <p>Sample waters are invented. This book stays in this browser.</p>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            if (window.confirm("Replace this book with the sample week?")) restoreSample();
          }}
        >
          Restore sample book
        </button>
      </footer>
    </div>
  );
}
