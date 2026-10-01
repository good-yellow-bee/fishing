import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  WATER_LABELS,
  catchesForTrip,
  localDate,
  shiftDate,
  spotById,
  tripById,
  upcomingTrips,
  recentTrips,
} from "@stillwater/shared";
import { CatchCard, TripCard } from "./cards";
import { TackleList } from "./gear/TackleList";
import { formatDay, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { TripWeather } from "./Weather";

export function TripsPage() {
  const { book } = useLogbook();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1>Trips</h1>
          <p className="lede">A day on a water, and the fish that came with it.</p>
        </div>
        <Link to="/trips/new" className="field-primary inline">
          Add a trip
        </Link>
      </header>
      <h2 className="subhead">Coming up</h2>
      {upcoming.length === 0 ? (
        <p className="empty">No upcoming outings.</p>
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
      <h2 className="subhead">Recent</h2>
      {recent.length === 0 ? (
        <p className="empty">No past outings.</p>
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
    </div>
  );
}

export function TripPage() {
  const { book } = useLogbook();
  const { tripId = "" } = useParams();
  const trip = tripById(book, tripId);

  if (!trip) {
    return (
      <div className="sheet">
        <h1>Missing outing</h1>
        <p className="lede">That trip is not in this book.</p>
        <Link to="/trips">Back to trips</Link>
      </div>
    );
  }

  const spot = spotById(book, trip.spotId);
  const catches = catchesForTrip(book, trip.id);
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">
            <Link to="/trips">Trips</Link>
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
        <Link to={`/catches/new?trip=${trip.id}&spot=${trip.spotId}`} className="field-primary inline">
          Add a catch
        </Link>
      </header>
      {trip.note ? <p className="prose">{trip.note}</p> : null}
      <TripWeather catches={catches} />
      <TackleList tripId={trip.id} heading="Tackle" />
      <div className="section-head">
        <h2>Fish on this outing</h2>
      </div>
      {catches.length === 0 ? (
        <p className="empty">Nothing logged for this trip yet.</p>
      ) : (
        <div className="stack">
          {catches.map((entry) => (
            <CatchCard key={entry.id} entry={entry} spotName={spot?.name ?? "Unknown water"} tripTitle={null} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TripFormPage() {
  const { book, addTrip } = useLogbook();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = book.spots.some((spot) => spot.id === params.get("spot")) ? (params.get("spot") as string) : (book.spots[0]?.id ?? "");
  const [date, setDate] = useState(() => localDate(new Date()));
  const [spotId, setSpotId] = useState(preset);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = addTrip({ date, spotId, title, note });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(`/trips/${result.id}`);
  };

  if (book.spots.length === 0) {
    return (
      <div className="sheet">
        <h1>Add a trip</h1>
        <p className="lede">Add a spot first so the outing has a water.</p>
        <Link to="/spots/new" className="field-primary inline">
          Add a spot
        </Link>
      </div>
    );
  }

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">New outing</p>
          <h1>Add a trip</h1>
        </div>
        <Link to="/trips">Cancel</Link>
      </header>
      <form className="entry-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Date
            <input name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label>
            Spot
            <select name="spot" value={spotId} onChange={(event) => setSpotId(event.target.value)}>
              {book.spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            Title
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Dawn patrol"
            />
          </label>
          <label className="wide">
            Note
            <textarea
              name="note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Wind, water color, what you meant to try."
            />
          </label>
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline">
          Save trip
        </button>
      </form>
    </div>
  );
}
