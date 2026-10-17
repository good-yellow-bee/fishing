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
  recentTrips,
  itemsForTrip,
  tripsForSpot,
  type Spot,
  type Trip,
  type TripCount,
} from "@stillwater/shared";
import { CatchCard, TripCard } from "./cards";
import { tripNeighbors } from "./catchNeighbors";
import { PagedCatches } from "./PagedCatches";
import { EditDelete } from "./EditDelete";
import { TackleList } from "./gear/TackleList";
import { useTackle } from "./gear/TackleState";
import { fishCountLabel, formatClock, formatDay, formatTimeOfDay, messageText, outingName, toLocalInput, tripWhen } from "./format";
import { PagedTrips } from "./PagedTrips";
import { SAME_TIME_DAYS, thisWeekInPastYears } from "./yearsAgo";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { tripsCsv } from "./catchCsv";
import { LureChips, SpeciesChips } from "./SpeciesChips";
import { WaterTipsBox, sameTimeText } from "./WaterTipsBox";
import { exactTerm } from "./findLinks";
import { packingTips } from "./waterTips";
import { datedName, downloadFile } from "./download";
import { tripIcs, tripIcsName } from "./tripIcs";
import { tripSummary } from "./summaries";
import { fishPace } from "./tripPace";
import { bestOutingHere, outingAverage } from "./outingAverage";
import { osmLink } from "./osmLink";
import { placeFor } from "./map/places";
import { sunTimes } from "./sunTimes";
import { NearestWater, canFindNearest } from "./NearestWater";
import { CopySummary } from "./CopySummary";
import { useLogbook } from "./LogbookState";
import { TripWeather } from "./Weather";
import { t, tn, useT } from "../i18n";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { useKeptForm } from "./keptForm";
import { findTrips } from "./tripSearch";
import { fishOnOutingDay } from "./suggestions";
import "./search.css";
import { PLAY_LAKE_ID, offPlayLake, upcomingOwnTrips } from "./playLake";
import { likelyWater } from "./spotOrder";
import { useStepKeys } from "./stepKeys";

/** The moon an outing fishes under: that day's evening, as the lake's forecast reads it. */
function tripNight(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 22);
}


/** "Fish came between 06:40 and 09:15", with the day too when the first and last fish fell on different days, and the pace when it says something. */
function fishSpan(first: string, last: string, count: number): string {
  const sameDay = localDate(new Date(first)) === localDate(new Date(last));
  const show = sameDay ? formatTimeOfDay : formatClock;
  // Two fish in the same minute: one time, not "between 4:05 PM and 4:05 PM".
  const span = show(first) === show(last) ? t("Fish came at {time}", { time: show(first) }) : t("Fish came between {from} and {to}", { from: show(first), to: show(last) });
  const pace = fishPace(first, last, count);
  return pace ? `${span}, ${pace}` : span;
}

/** The search for outings, kept in the address so Back from an outing returns to the same matches. */
const TRIP_FIND = "find";

export function TripsPage() {
  const { book } = useLogbook();
  useT();
  const [params, setParams] = useSearchParams();
  const query = params.get(TRIP_FIND) ?? "";
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = upcomingOwnTrips(book, today);
  const recent = recentTrips(book, today);
  const fishByTrip = fishCountsByTrip(book);
  // How the outings already fished have gone, across every water.
  const average = outingAverage(book.trips.filter(offPlayLake), (id) => fishByTrip.get(id) ?? 0, today);
  const needle = query.trim();
  const found = needle ? findTrips(book, needle, (id) => fishByTrip.get(id) ?? 0, today, t) : [];
  const card = (trip: Trip, level?: 4) => (
    <TripCard
      level={level}
      key={trip.id}
      trip={trip}
      spotName={spotById(book, trip.spotId)?.name ?? t("Unknown water")}
      waterType={spotById(book, trip.spotId)?.waterType ?? null}
      fishCount={fishByTrip.get(trip.id) ?? 0}
      today={today}
      tomorrow={tomorrow}
    />
  );

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
      {book.trips.length > 0 ? (
        <section className="catch-search trip-search" aria-label={t("Find an outing")}>
          <label htmlFor="trip-search">{t("Find an outing")}</label>
          <input
            id="trip-search"
            type="search"
            value={query}
            placeholder={t("Water, month, “no fish”…")}
            autoComplete="off"
            onChange={(event) => {
              const next = event.target.value;
              setParams(
                (current) => {
                  const out = new URLSearchParams(current);
                  if (next.trim()) out.set(TRIP_FIND, next);
                  else out.delete(TRIP_FIND);
                  return out;
                },
                { replace: true },
              );
            }}
          />
          <div role="status" className={needle ? (found.length === 0 ? "empty" : "search-count") : undefined}>
            {needle ? <p>{found.length === 0 ? t("No outing matches that.") : t("Outings: {count}", { count: found.length })}</p> : null}
          </div>
          {found.length > 0 ? (
            <PagedTrips key={needle} trips={found} fishOn={(id) => fishByTrip.get(id) ?? 0} stack>
              {(trip) => card(trip, 4)}
            </PagedTrips>
          ) : null}
        </section>
      ) : null}
      {needle ? null : (
        <>
          <h2 className="subhead">{t("Coming up")}</h2>
          {upcoming.length === 0 ? (
            <p className="empty">
              {t("No upcoming outings.")} <Link to="/trips/new">{t("Plan one")}</Link>
            </p>
          ) : (
            <div className="stack">
              {upcoming.map((trip) => card(trip))}
            </div>
          )}
          <h2 className="subhead">{t("Recent")}</h2>
          {average ? <p className="meta">{average}</p> : null}
          {book.trips.length > 0 ? (
            <p className="fish-csv">
              <button type="button" className="text-button" onClick={() => downloadFile(tripsCsv(book), "text/csv;charset=utf-8", datedName("stillwater-outings.csv"))}>
                {t("Download the outings as a spreadsheet")}
              </button>
            </p>
          ) : null}
          {recent.length === 0 ? (
            <p className="empty">{t("No past outings.")}</p>
          ) : (
            <PagedTrips trips={recent} fishOn={(id) => fishByTrip.get(id) ?? 0} stack>
              {(trip) => card(trip, 4)}
            </PagedTrips>
          )}
        </>
      )}
    </div>
  );
}

/** Keyed by the outing, so stepping to the next one starts fresh: no open delete question or half-typed tackle carried over. */
export function TripPage() {
  const { tripId = "" } = useParams();
  return <TripView key={tripId} />;
}

const TRIP_COUNTS: { count: TripCount; label: string; more: string; fewer: string }[] = [
  { count: "lost", label: "Lost fish", more: "One more lost fish", fewer: "One fewer lost fish" },
  { count: "missed", label: "Missed strikes", more: "One more missed strike", fewer: "One fewer missed strike" },
];

/** Tap-to-count tallies of fish lost and strikes missed on an outing, and how many of the hooked fish were landed. */
function TripCounts({ trip, landed }: { trip: Trip; landed: number }) {
  const { countOnTrip } = useLogbook();
  useT();
  const lost = trip.lost ?? 0;
  return (
    <div className="trip-counts">
      {TRIP_COUNTS.map(({ count, label, more, fewer }) => (
        <p key={count} className="trip-count">
          {/* Read out as it changes, since the buttons are named for what they do. */}
          <span role="status">
            {t(label)}: <strong>{trip[count] ?? 0}</strong>
          </span>
          {/* Not disabled outright: focus stays on the button when the count reaches none. */}
          <button
            type="button"
            className="count-button"
            aria-label={t(fewer)}
            aria-disabled={trip[count] ? undefined : true}
            onClick={() => {
              if (trip[count]) countOnTrip(trip.id, count, -1);
            }}
          >
            −
          </button>
          <button type="button" className="count-button" aria-label={t(more)} onClick={() => countOnTrip(trip.id, count, 1)}>
            +
          </button>
        </p>
      ))}
      {lost > 0 && landed > 0 ? <p className="meta">{t("Landed {landed} of {hooked} hooked.", { landed, hooked: landed + lost })}</p> : null}
    </div>
  );
}

/** The day's sunrise and sunset at the water, for a water with a place (its own pin or the sample sheet's), in this device's clock. */
function SunLine({ date, spot }: { date: string; spot: Spot }) {
  const place = spot.place ?? placeFor(spot.id);
  if (!place) return null;
  const sun = sunTimes(date, place.lat, place.lng);
  return (
    <p className="meta sun-line">
      {"rise" in sun
        ? t("Sunrise {rise} · sunset {set}", { rise: formatTimeOfDay(sun.rise.toISOString()), set: formatTimeOfDay(sun.set.toISOString()) })
        : sun.always === "up"
          ? t("The sun doesn't set that day.")
          : t("The sun doesn't rise that day.")}
    </p>
  );
}

function TripView() {
  const { book, deleteTrip, fileCatches } = useLogbook();
  useT();
  useStepKeys();
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
  const fishByTrip = fishCountsByTrip(book);
  const best = bestOutingHere(tripsForSpot(book, trip.spotId), (id) => fishByTrip.get(id) ?? 0, trip.id, today);
  // The outing on this water before this one, to set the two side by side.
  const lastHere = tripsForSpot(book, trip.spotId)
    .filter((other) => other.date < trip.date && other.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  // Fish from this water on the outing's day (or its small hours) that were logged without it.
  const loose = book.catches.filter(
    (entry) => entry.tripId === null && entry.spotId === trip.spotId && fishOnOutingDay(book, trip.spotId, toLocalInput(new Date(entry.caughtAt)), trip.date),
  );
  // A day of the game on its lake: no fish to log by hand, nothing to plan or pack.
  const play = trip.spotId === PLAY_LAKE_ID;
  const tackle = play ? null : (
    <TackleList
      tripId={trip.id}
      heading={t("Tackle")}
      suggest={packingTips(book, trip, today)}
      caught={catchesForTrip(book, trip.id)}
      trips={book.trips}
      spots={book.spots}
    />
  );
  const fish = (
    <>
      <div className="section-head">
        <h2 id="outing-fish" tabIndex={-1}>
          {t("Fish on this outing")}
        </h2>
      </div>
      <FishSum catches={catches} />
      {/* Kept on the water, from the outing's day on: the fish that got away and the strikes that missed. */}
      {trip.date <= today ? <TripCounts trip={trip} landed={catches.length} /> : null}
      {catches.length > 1 ? (
        <p className="meta fish-span">
          {/* Newest first: the last in the list came first. */}
          {fishSpan(catches[catches.length - 1]!.caughtAt, catches[0]!.caughtAt, catches.length)}
        </p>
      ) : null}
      {/* Against every other outing on the same water. */}
      {best ? <p className="meta best-outing">{best}</p> : null}
      {lastHere ? (
        <p className="meta last-here">
          <Link to={`/trips/${lastHere.id}`}>
            {t("Last time here, {day}: {fish}", { day: formatDay(lastHere.date), fish: fishCountLabel(fishByTrip.get(lastHere.id) ?? 0) })}
          </Link>
        </p>
      ) : null}
      {/* Before going back: what was learned there last time, in the angler's own words. */}
      {lastHere?.note.trim() && trip.date >= today ? <p className="meta last-note">{t("Last time you wrote: “{note}”", { note: lastHere.note.trim() })}</p> : null}
      <SpeciesChips catches={catches} />
      <LureChips catches={catches} outing={trip} />
      <FishCsv catches={catches} name={`${trip.date} ${outingName(trip, book.spots)}`} />
      {loose.length > 0 ? (
        <p className="meta loose-fish" role="status">
          {tn(loose.length, "{n} fish from this water that day is not on this outing.", "{n} fish from this water that day are not on this outing.")}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              // The line and its button go once the fish are filed: the fish list's heading takes focus.
              if (fileCatches(loose.map((entry) => entry.id), trip.id)) document.getElementById("outing-fish")?.focus();
            }}
          >
            {t("Add them")}
          </button>
        </p>
      ) : null}
      {catches.length === 0 ? (
        <p className="empty">
          {trip.date > today ? t("Fish you log on the day show up here.") : trip.date === today ? t("No fish logged yet today.") : t("Nothing logged for this trip yet.")}
          {trip.date === today && !play ? (
            <>
              {" "}
              <Link to={`/catches/new?trip=${trip.id}&spot=${trip.spotId}`}>{t("Log the first one")}</Link>
            </>
          ) : null}
        </p>
      ) : (
        // A past outing reads as the day went, first fish first, like its weather; on the day, the newest leads.
        <PagedCatches items={trip.date < today ? [...catches].reverse() : catches}>
          {(entry) => (
            <CatchCard
              key={entry.id}
              entry={entry}
              // The outing's own water is in its header; only a fish from elsewhere names its water.
              spotName={entry.spotId === trip.spotId ? null : (spotById(book, entry.spotId)?.name ?? t("Unknown water"))}
              tripTitle={null}
              list={`trip:${trip.id}`}
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
          if (deleteTrip(trip.id)) navigate("/trips");
        }}
        aside={
          // An outing still ahead has no fish to log yet; a catch can't be dated in the future.
          trip.date <= today && !play ? (
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
        <h1>{outingName(trip, book.spots)}</h1>
        <p className="meta stand">
          <time dateTime={trip.date}>{formatDay(trip.date)}</time>
          {spot ? (
            <>
              {" · "}
              <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
              {" · "}
              {t(WATER_LABELS[spot.waterType])}
              {/* On the way there: the water's pin, one tap from the outing. */}
              {spot.place ? (
                <span className="map-link">
                  {" · "}
                  <a href={osmLink(spot.place.lat, spot.place.lng)} target="_blank" rel="noreferrer">
                    {t("Open on a map")}
                  </a>
                </span>
              ) : null}
            </>
          ) : null}
        </p>
        <p className="meta moon-line">{t("Moon: {phase}", { phase: t(MOON_LABELS[moonName(moonPhase(tripNight(trip.date)))]) })}</p>
        {spot ? <SunLine date={trip.date} spot={spot} /> : null}
      </EditDelete>
      {trip.note ? <p className="prose">{trip.note}</p> : null}
      {play ? null : trip.date >= today ? (
        <p className="trip-calendar">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              // An untitled outing goes by its water's name, as its heading does.
              const named = { ...trip, title: outingName(trip, book.spots) };
              downloadFile(tripIcs(named, spot?.name ?? null, new Date(), spot?.place), "text/calendar;charset=utf-8", tripIcsName(named));
            }}
          >
            {t("Add to calendar")}
          </button>
          {" · "}
          {/* The outing and its tackle list on paper, to tick off while packing. */}
          <button type="button" className="text-button" onClick={() => window.print()}>
            {t("Print the packing list")}
          </button>
        </p>
      ) : (
        spot ? (
          <p className="trip-again">
            <Link to={`/trips/new?spot=${spot.id}&again=${trip.id}`}>{t("Go again")}</Link>
          </p>
        ) : null
      )}
      {catches.length > 0 ? <CopySummary text={() => tripSummary(trip, spot?.name ?? null, catches, (id) => spotById(book, id)?.name ?? null)} file="stillwater-outing.txt" /> : null}
      {/* Planning ahead: what has worked on this water before. */}
      {trip.date >= today && spot && !play ? <WaterTipsBox catches={catchesForSpot(book, spot.id)} on={trip.date} within={exactTerm("water", spot.name)} /> : null}
      <TripWeather catches={catches} />
      {/* Once the day comes, the fish lead; before that, the bag does. */}
      {fishFirst ? fish : tackle}
      {fishFirst ? tackle : fish}
      {newer || older ? (
        <nav className="catch-steps" aria-label={t("More outings")}>
          {newer ? (
            <Link to={`/trips/${newer.id}`} rel="prev">
              {t("← Later: {title}", { title: `${outingName(newer, book.spots)}, ${formatDay(newer.date)}` })}
            </Link>
          ) : (
            <span />
          )}
          {older ? (
            <Link to={`/trips/${older.id}`} rel="next">
              {t("Earlier: {title} →", { title: `${outingName(older, book.spots)}, ${formatDay(older.date)}` })}
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
  const { book, storedBook, addTrip, updateTrip } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [params] = useSearchParams();
  const existing = tripId ? tripById(book, tripId) : undefined;
  // "Go again" from a past outing: same water and title, and its tackle list comes along.
  const again = existing ? undefined : tripById(book, params.get("again") ?? "");
  const { items, add } = useTackle();
  const againTackle = again ? itemsForTrip(items, again.id) : [];
  const preset = book.spots.some((spot) => spot.id === params.get("spot")) ? (params.get("spot") as string) : likelyWater(book, localDate(new Date()));
  const presetDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? (params.get("date") as string) : localDate(new Date());
  const [date, setDate] = useState(existing?.date ?? presetDate);
  const [spotId, setSpotId] = useState(existing?.spotId ?? preset);
  // Planning a day on a water: how the last one there went.
  const lastHere = existing ? undefined : recentTrips(book, localDate(new Date())).find((trip) => trip.spotId === spotId);
  // A second outing on the same water and day is usually a slip; say which one is already there.
  const sameDay = book.trips.find((trip) => trip.spotId === spotId && trip.date === date && trip.id !== existing?.id);
  // What this water gave around the same date in earlier years, for an outing being planned.
  const pastWeek = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    if (existing || !y || !m || !d) return [];
    return thisWeekInPastYears(catchesForSpot(book, spotId), new Date(y, m - 1, d, 12), SAME_TIME_DAYS, Infinity);
  }, [book, spotId, date, existing]);
  // Made from a fish logged without an outing: that day's fish (and its small hours') on this water with none go on the new one.
  const loose = useMemo(
    () =>
      existing || !params.has("loose")
        ? []
        : book.catches
            .filter((entry) => !entry.tripId && entry.spotId === spotId && fishOnOutingDay(book, spotId, toLocalInput(new Date(entry.caughtAt)), date))
            .map((entry) => entry.id),
    [book, existing, params, spotId, date],
  );
  const [title, setTitle] = useState(existing?.title ?? again?.title ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");
  // Unsaved changes to an outing in the book wait for the next visit to its form.
  const kept = useKeptForm(
    existing ? `trip:${existing.id}` : null,
    existing ? JSON.stringify(storedBook.trips.find((trip) => trip.id === existing.id) ?? existing) : "",
    { date, spotId, title, note },
    (fields) => {
      if (fields.date) setDate(fields.date);
      if (book.spots.some((spot) => spot.id === fields.spotId)) setSpotId(fields.spotId!);
      setTitle(fields.title ?? "");
      setNote(fields.note ?? "");
    },
  );

  // An outing with fish already on it: they go where it goes, but they keep the times they were caught.
  const ownFish = existing ? catchesForTrip(book, existing.id) : [];
  const fishDays = ownFish.filter((entry) => fishOnOutingDay(book, spotId, toLocalInput(new Date(entry.caughtAt)), date)).length;
  const firstFishDay = ownFish.length > 0 ? localDate(new Date([...ownFish].sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))[0]!.caughtAt)) : null;
  const today = localDate(new Date());

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Fish already caught can't sit on an outing still to come.
    if (firstFishDay && date > today) {
      setError(t("This outing already has fish, so it can't be moved to a day still to come."));
      markInvalid(event.currentTarget as HTMLFormElement, "date");
      return;
    }
    const draft = { date, spotId, title, note };
    const result = existing ? updateTrip(existing.id, draft) : addTrip(draft, loose);
    if (!result.ok) {
      setError(result.message);
      markInvalid(event.currentTarget as HTMLFormElement, result.field);
      return;
    }
    for (const item of againTackle) add(result.id, item.label);
    kept.drop();
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

  // The game's lake alone is no water to log a real day on.
  if (!existing && !book.spots.some((spot) => spot.id !== PLAY_LAKE_ID)) {
    return (
      <div className="sheet">
        <h1>{t("Add a trip")}</h1>
        <p className="lede">{t("Add a spot first so the outing has a water.")}</p>
        <Link to="/spots/new?then=trip" className="field-primary inline">
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
          <h1 data-title={existing ? t("Editing {name}", { name: outingName(existing, book.spots) }) : undefined}>{existing ? outingName(existing, book.spots) : t("Add a trip")}</h1>
        </div>
        <Link to={existing ? `/trips/${existing.id}` : "/trips"} onClick={kept.drop}>
          {t("Cancel")}
        </Link>
      </header>
      {kept.banner}
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
          <div className="water-field">
            <label>
              {t("Spot")}
              <select name="spot" value={spotId} onChange={(event) => setSpotId(event.target.value)}>
                {/* The game's lake only for what is already there. */}
                {book.spots.filter((spot) => spot.id !== PLAY_LAKE_ID || spot.id === spotId).map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.name}
                  </option>
                ))}
              </select>
              {lastHere ? (
                <small className="field-hint">
                  {t("Last here: {title}, {day} · {fish}", {
                    title: outingName(lastHere, book.spots),
                    day: formatDay(lastHere.date),
                    fish: fishCountLabel(catchesForTrip(book, lastHere.id).length),
                  })}
                </small>
              ) : null}
            </label>
            {!existing && canFindNearest(book) ? <NearestWater book={book} onPick={setSpotId} /> : null}
          </div>
          {pastWeek.length > 0 ? (
            <p className="wide form-note">
              {sameTimeText(pastWeek)}
            </p>
          ) : null}
          {sameDay ? (
            <p className="wide form-note" role="status">
              {t("You already have an outing on this water that day:")} <Link to={`/trips/${sameDay.id}`}>{outingName(sameDay, book.spots)}</Link>
            </p>
          ) : null}
          {existing && ownFish.length > 0 && spotId !== existing.spotId ? (
            <p className="wide form-note" role="status">
              {tn(ownFish.length, "Its fish moves to this water too.", "Its {n} fish move to this water too.")}
            </p>
          ) : null}
          {existing && firstFishDay && date !== existing.date && fishDays === 0 ? (
            <p className="wide form-note" role="status">
              {tn(ownFish.length, "Its fish was caught on {day} and keeps that day.", "Its fish were caught on {day} and keep that day.", { day: formatDay(firstFishDay) })}
            </p>
          ) : null}
          {loose.length > 0 ? (
            <p className="wide form-note" role="status">
              {tn(loose.length, "The fish you logged here that day goes on this outing.", "The {n} fish you logged here that day go on this outing.")}
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
            {t("The tackle list from “{title}” comes along, unpacked.", { title: outingName(again, book.spots) })}
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

