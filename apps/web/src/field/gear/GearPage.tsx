import { Link, useParams } from "react-router-dom";
import {
  WATER_LABELS,
  localDate,
  recentTrips,
  shiftDate,
  spotById,
  tripById,
  upcomingTrips,
  type Trip,
} from "@stillwater/shared";
import { formatDay, tripWhen } from "../format";
import { useLogbook } from "../LogbookState";
import { TackleList } from "./TackleList";

function TripTackle({ trip, today, tomorrow }: { trip: Trip; today: string; tomorrow: string }) {
  const { book } = useLogbook();
  const spot = spotById(book, trip.spotId);

  return (
    <section className="tackle-trip">
      <div className="section-head">
        <h2>
          <Link to={`/trips/${trip.id}`}>{trip.title}</Link>
        </h2>
        <span className="meta">
          {tripWhen(trip.date, today, tomorrow)}
          {spot ? ` · ${spot.name}` : ""}
        </span>
      </div>
      <TackleList tripId={trip.id} />
    </section>
  );
}

export function GearPage() {
  const { book } = useLogbook();
  const { tripId } = useParams();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);

  if (tripId) {
    const trip = tripById(book, tripId);
    if (!trip) {
      return (
        <div className="sheet">
          <h1>Missing outing</h1>
          <p className="lede">That trip is not in this book.</p>
          <Link to="/gear">Back to tackle</Link>
        </div>
      );
    }
    const spot = spotById(book, trip.spotId);
    return (
      <div className="sheet">
        <header className="sheet-head">
          <div>
            <p className="eyebrow">
              <Link to="/gear">Tackle</Link>
              {" · "}
              {tripWhen(trip.date, today, tomorrow)}
            </p>
            <h1>{trip.title}</h1>
            <p className="meta stand">
              <time dateTime={trip.date}>{formatDay(trip.date)}</time>
              {spot ? (
                <>
                  {" · "}
                  <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
                  {" · "}
                  {WATER_LABELS[spot.waterType]}
                </>
              ) : null}
            </p>
          </div>
          <Link to={`/trips/${trip.id}`}>Outing</Link>
        </header>
        <TackleList tripId={trip.id} heading="In the bag" />
      </div>
    );
  }

  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">Before you leave</p>
          <h1>Tackle</h1>
          <p className="lede">What goes in the bag for each outing. A check stays in this browser.</p>
        </div>
      </header>
      <h2 className="subhead">Coming up</h2>
      {upcoming.length === 0 ? (
        <p className="empty">No upcoming outings.</p>
      ) : (
        upcoming.map((trip) => <TripTackle key={trip.id} trip={trip} today={today} tomorrow={tomorrow} />)
      )}
      <h2 className="subhead">Recent</h2>
      {recent.length === 0 ? (
        <p className="empty">No past outings.</p>
      ) : (
        recent.map((trip) => <TripTackle key={trip.id} trip={trip} today={today} tomorrow={tomorrow} />)
      )}
    </div>
  );
}
