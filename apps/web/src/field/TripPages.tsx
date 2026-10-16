import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MOON_LABELS,
  WATER_LABELS,
  moonName,
  moonPhase,
  catchesForSpot,
  catchesForTrip,
  fishCountsByTrip,
  localDate,
  shiftDate,
  spotById,
  tripById,
  upcomingTrips,
  recentTrips,
  itemsForTrip,
} from "@stillwater/shared";
import { CatchCard, TripCard } from "./cards";
import { tripNeighbors } from "./catchNeighbors";
import { PagedCatches } from "./PagedCatches";
import { EditDelete } from "./EditDelete";
import { TackleList } from "./gear/TackleList";
import { useTackle } from "./gear/TackleState";
import { fishCountLabel, formatClock, formatDay, formatTimeOfDay, messageText, tripWhen } from "./format";
import { PagedTrips } from "./PagedTrips";
import { thisWeekInPastYears } from "./yearsAgo";
import { speciesCounts } from "./speciesLink";
import { FishSum } from "./FishSum";
import { SpeciesChips } from "./SpeciesChips";
import { WaterTipsBox } from "./WaterTipsBox";
import { exactTerm } from "./findLinks";
import { packingTips } from "./waterTips";
import { downloadFile } from "./download";
import { tripIcs, tripIcsName } from "./tripIcs";
import { useLogbook } from "./LogbookState";
import { TripWeather } from "./Weather";
import { t, tn, useT } from "../i18n";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";

/** The moon an outing fishes under: that day's evening, as the lake's forecast reads it. */
function tripNight(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 22);
}


/** "Fish came between 06:40 and 09:15", with the day too when the first and last fish fell on different days. */
function fishSpan(first: string, last: string): string {
  const sameDay = localDate(new Date(first)) === localDate(new Date(last));
  const show = sameDay ? formatTimeOfDay : formatClock;
  return t("Fish came between {from} and {to}", { from: show(first), to: show(last) });
}

export function TripsPage() {
  const { book } = useLogbook();
  useT();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today);
  const fishByTrip = fishCountsByTrip(book);

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
        <p className="empty">
          {t("No upcoming outings.")} <Link to="/trips/new">{t("Plan one")}</Link>
        </p>
      ) : (
        <div className="stack">
          {upcoming.map((trip) => (
            <TripCard
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
      <h2 className="subhead">{t("Recent")}</h2>
      {recent.length === 0 ? (
        <p className="empty">{t("No past outings.")}</p>
      ) : (
        <PagedTrips trips={recent} fishOn={(id) => fishByTrip.get(id) ?? 0} stack>
          {(trip) => (
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
          )}
        </PagedTrips>
      )}
    </div>
  );
}

export function TripPage() {
  const { book, deleteTrip, fileCatches } = useLogbook();
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
  const { newer, older } = tripNeighbors(book, trip.id);

  // Fish from this water on the outing's day that were logged without it.
  const loose = book.catches.filter(
    (entry) => entry.tripId === null && entry.spotId === trip.spotId && localDate(new Date(entry.caughtAt)) === trip.date,
  );
  const tackle = (
    <TackleList tripId={trip.id} heading={t("Tackle")} suggest={packingTips(book, trip, today)} caught={catchesForTrip(book, trip.id)} />
  );
  const fish = (
    <>
      <div className="section-head">
        <h2>{t("Fish on this outing")}</h2>
      </div>
      <FishSum catches={catches} />
      {catches.length > 1 ? (
        <p className="meta fish-span">
          {/* Newest first: the last in the list came first. */}
          {fishSpan(catches[catches.length - 1]!.caughtAt, catches[0]!.caughtAt)}
        </p>
      ) : null}
      <SpeciesChips catches={catches} />
      {loose.length > 0 ? (
        <p className="meta loose-fish" role="status">
          {tn(loose.length, "{n} fish from this water that day is not on this outing.", "{n} fish from this water that day are not on this outing.")}{" "}
          <button type="button" className="text-button" onClick={() => fileCatches(loose.map((entry) => entry.id), trip.id)}>
            {t("Add them")}
          </button>
        </p>
      ) : null}
      {catches.length === 0 ? (
        <p className="empty">
          {trip.date > today ? t("Fish you log on the day show up here.") : trip.date === today ? t("No fish logged yet today.") : t("Nothing logged for this trip yet.")}
          {trip.date === today ? (
            <>
              {" "}
              <Link to={`/catches/new?trip=${trip.id}&spot=${trip.spotId}`}>{t("Log the first one")}</Link>
            </>
          ) : null}
        </p>
      ) : (
        <PagedCatches items={catches}>
          {(entry) => (
            <CatchCard
              key={entry.id}
              entry={entry}
              // The outing's own water is in its header; only a fish from elsewhere names its water.
              spotName={entry.spotId === trip.spotId ? null : (spotById(book, entry.spotId)?.name ?? t("Unknown water"))}
              tripTitle={null}
            />
          )}
        </PagedCatches>
      )}
    </>
  );
  // From the outing's own day on, the fish lead: on the water, the bag is already packed.
  const fishFirst = catches.length > 0 || trip.date <= today;

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
          // An outing still ahead has no fish to log yet; a catch can't be dated in the future.
          trip.date <= today ? (
            <Link to={`/catches/new?trip=${trip.id}&spot=${trip.spotId}`} className="field-primary inline">
              {t("Add a catch")}
            </Link>
          ) : null
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
        <p className="meta moon-line">{t("Moon: {phase}", { phase: t(MOON_LABELS[moonName(moonPhase(tripNight(trip.date)))]) })}</p>
      </EditDelete>
      {trip.note ? <p className="prose">{trip.note}</p> : null}
      {trip.date >= today ? (
        <p className="trip-calendar">
          <button
            type="button"
            className="text-button"
            onClick={() => downloadFile(tripIcs(trip, spot?.name ?? null), "text/calendar;charset=utf-8", tripIcsName(trip))}
          >
            {t("Add to calendar")}
          </button>
        </p>
      ) : (
        spot ? (
          <p className="trip-again">
            <Link to={`/trips/new?spot=${spot.id}&again=${trip.id}`}>{t("Go again")}</Link>
          </p>
        ) : null
      )}
      {/* Planning ahead: what has worked on this water before. */}
      {trip.date >= today && spot ? <WaterTipsBox catches={catchesForSpot(book, spot.id)} on={trip.date} within={exactTerm("water", spot.name)} /> : null}
      <TripWeather catches={catches} />
      {/* Once the day comes, the fish lead; before that, the bag does. */}
      {fishFirst ? fish : tackle}
      {fishFirst ? tackle : fish}
      {newer || older ? (
        <nav className="catch-steps" aria-label={t("More outings")}>
          {newer ? (
            <Link to={`/trips/${newer.id}`} rel="prev">
              {t("← Later: {title}", { title: newer.title })}
            </Link>
          ) : (
            <span />
          )}
          {older ? (
            <Link to={`/trips/${older.id}`} rel="next">
              {t("Earlier: {title} →", { title: older.title })}
            </Link>
          ) : null}
        </nav>
      ) : null}
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
  // "Go again" from a past outing: same water and title, and its tackle list comes along.
  const again = existing ? undefined : tripById(book, params.get("again") ?? "");
  const { items, add } = useTackle();
  const againTackle = again ? itemsForTrip(items, again.id) : [];
  const preset = book.spots.some((spot) => spot.id === params.get("spot")) ? (params.get("spot") as string) : (book.spots[0]?.id ?? "");
  const [date, setDate] = useState(existing?.date ?? localDate(new Date()));
  const [spotId, setSpotId] = useState(existing?.spotId ?? preset);
  // Planning a day on a water: how the last one there went.
  const lastHere = existing ? undefined : recentTrips(book, localDate(new Date())).find((trip) => trip.spotId === spotId);
  // A second outing on the same water and day is usually a slip; say which one is already there.
  const sameDay = book.trips.find((trip) => trip.spotId === spotId && trip.date === date && trip.id !== existing?.id);
  // What this water gave in the same week of earlier years, for an outing being planned.
  const pastWeek = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    if (existing || !y || !m || !d) return [];
    return thisWeekInPastYears(catchesForSpot(book, spotId), new Date(y, m - 1, d, 12), 3, Infinity);
  }, [book, spotId, date, existing]);
  const [title, setTitle] = useState(existing?.title ?? again?.title ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const draft = { date, spotId, title, note };
    const result = existing ? updateTrip(existing.id, draft) : addTrip(draft);
    if (!result.ok) {
      setError(result.message);
      markInvalid(event.currentTarget as HTMLFormElement, result.field);
      return;
    }
    for (const item of againTackle) add(result.id, item.label);
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
          <h1 data-title={existing ? t("Editing {name}", { name: existing.title }) : undefined}>{existing ? existing.title : t("Add a trip")}</h1>
        </div>
        <Link to={existing ? `/trips/${existing.id}` : "/trips"}>{t("Cancel")}</Link>
      </header>
      <form
        className="entry-form"
        onSubmit={onSubmit}
        onInput={(event) => {
          // A change after a refused save clears the complaint.
          if (!error) return;
          setError("");
          clearInvalid(event.currentTarget);
        }}
      >
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
            {lastHere ? (
              <small className="field-hint">
                {t("Last here: {title}, {day} · {fish}", {
                  title: lastHere.title,
                  day: formatDay(lastHere.date),
                  fish: fishCountLabel(catchesForTrip(book, lastHere.id).length),
                })}
              </small>
            ) : null}
          </label>
          {pastWeek.length > 0 ? (
            <p className="wide form-note">
              {t("This week in earlier years here: {fish}, {species}.", {
                fish: fishCountLabel(pastWeek.length),
                species: speciesCounts(pastWeek)
                  .map((row) => t(row.species))
                  .join(", "),
              })}
            </p>
          ) : null}
          {sameDay ? (
            <p className="wide form-note" role="status">
              {t("You already have an outing on this water that day:")} <Link to={`/trips/${sameDay.id}`}>{sameDay.title}</Link>
            </p>
          ) : null}
          <label className="wide">
            {t("Title")}
            <input
              name="title"
              maxLength={60}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("Dawn patrol")}
            />
          </label>
          <label className="wide">
            {t("Note")}
            <textarea
              name="note"
              maxLength={400}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("Wind, water color, what you meant to try.")}
            />
          </label>
        </div>
        {again && againTackle.length > 0 ? (
          <p className="again-note">
            {t("The tackle list from “{title}” comes along, unpacked.", { title: again.title })}
          </p>
        ) : null}
        {error ? (
          <p className="field-error" role="alert" id={FORM_ERROR_ID}>
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
