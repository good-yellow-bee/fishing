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
import { PagedCatches } from "./PagedCatches";
import { EditDelete } from "./EditDelete";
import { TackleList } from "./gear/TackleList";
import { formatDay, messageText, tripWhen } from "./format";
import { FishSum } from "./FishSum";
import { useLogbook } from "./LogbookState";
import { TripWeather } from "./Weather";
import { t, useT } from "../i18n";

export function TripsPage() {
  const { book } = useLogbook();
  useT();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Calendar")}</p>
          <h1>{t("Trips")}</h1>
          <p className="lede">{t("A day on a water, and the fish that came with it.")}</p>
        </div>
        <Link to="/trips/new" className="field-primary inline">
          {t("Add a trip")}
        </Link>
      </header>
      <h2 className="subhead">{t("Coming up")}</h2>
      {upcoming.length === 0 ? (
        <p className="empty">{t("No upcoming outings.")}</p>
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
      <h2 className="subhead">{t("Recent")}</h2>
      {recent.length === 0 ? (
        <p className="empty">{t("No past outings.")}</p>
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
    </div>
  );
}

export function TripPage() {
  const { book, deleteTrip } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { tripId = "" } = useParams();
  const trip = tripById(book, tripId);

  if (!trip) {
    return (
      <div className="sheet">
        <h1>{t("Missing outing")}</h1>
        <p className="lede">{t("That trip is not in this book.")}</p>
        <Link to="/trips">{t("Back to trips")}</Link>
      </div>
    );
  }

  const spot = spotById(book, trip.spotId);
  const catches = catchesForTrip(book, trip.id);
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/trips/${trip.id}/edit`}
        ask={t("Delete this outing? Its fish stay in the book.")}
        onDelete={() => {
          deleteTrip(trip.id);
          navigate("/trips");
        }}
        aside={
          <Link to={`/catches/new?trip=${trip.id}&spot=${trip.spotId}`} className="field-primary inline">
            {t("Add a catch")}
          </Link>
        }
      >
        <p className="eyebrow">
          <Link to="/trips">{t("Trips")}</Link>
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
              {t(WATER_LABELS[spot.waterType])}
            </>
          ) : null}
        </p>
      </EditDelete>
      {trip.note ? <p className="prose">{trip.note}</p> : null}
      <TripWeather catches={catches} />
      <TackleList tripId={trip.id} heading={t("Tackle")} />
      <div className="section-head">
        <h2>{t("Fish on this outing")}</h2>
      </div>
      <FishSum catches={catches} />
      {catches.length === 0 ? (
        <p className="empty">{t("Nothing logged for this trip yet.")}</p>
      ) : (
        <PagedCatches items={catches}>
          {(entry) => <CatchCard key={entry.id} entry={entry} spotName={spot?.name ?? t("Unknown water")} tripTitle={null} />}
        </PagedCatches>
      )}
    </div>
  );
}

export function TripFormPage() {
  const { tripId } = useParams();
  const [params] = useSearchParams();
  return <TripForm key={`${tripId ?? ""}:${params.toString()}`} />;
}

function TripForm() {
  const { book, addTrip, updateTrip } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [params] = useSearchParams();
  const existing = tripId ? tripById(book, tripId) : undefined;
  const preset = book.spots.some((spot) => spot.id === params.get("spot")) ? (params.get("spot") as string) : (book.spots[0]?.id ?? "");
  const [date, setDate] = useState(existing?.date ?? localDate(new Date()));
  const [spotId, setSpotId] = useState(existing?.spotId ?? preset);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const draft = { date, spotId, title, note };
    const result = existing ? updateTrip(existing.id, draft) : addTrip(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(`/trips/${result.id}`);
  };

  if (tripId && !existing) {
    return (
      <div className="sheet">
        <h1>{t("Missing outing")}</h1>
        <p className="lede">{t("That trip is not in this book.")}</p>
        <Link to="/trips">{t("Back to trips")}</Link>
      </div>
    );
  }

  if (!existing && book.spots.length === 0) {
    return (
      <div className="sheet">
        <h1>{t("Add a trip")}</h1>
        <p className="lede">{t("Add a spot first so the outing has a water.")}</p>
        <Link to="/spots/new" className="field-primary inline">
          {t("Add a spot")}
        </Link>
      </div>
    );
  }

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{existing ? t("Edit outing") : t("New outing")}</p>
          <h1>{existing ? existing.title : t("Add a trip")}</h1>
        </div>
        <Link to={existing ? `/trips/${existing.id}` : "/trips"}>{t("Cancel")}</Link>
      </header>
      <form className="entry-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            {t("Date")}
            <input name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label>
            {t("Spot")}
            <select name="spot" value={spotId} onChange={(event) => setSpotId(event.target.value)}>
              {book.spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            {t("Title")}
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("Dawn patrol")}
            />
          </label>
          <label className="wide">
            {t("Note")}
            <textarea
              name="note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("Wind, water color, what you meant to try.")}
            />
          </label>
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {messageText(error)}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline">
          {existing ? t("Save changes") : t("Save trip")}
        </button>
      </form>
    </div>
  );
}
