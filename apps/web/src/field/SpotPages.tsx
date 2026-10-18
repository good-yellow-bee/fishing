import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { MapAnchor } from "./MapAnchor";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  WATER_LABELS,
  WATER_TYPES,
  biteTimes,
  catchesForSpot,
  fishCountsByTrip,
  localDate,
  shiftDate,
  spotById,
  tripsForSpot,
  type CatchEntry,
  type Trip,
} from "@stillwater/shared";
import { CatchCard, SpotCard, TripCard } from "./cards";
import { PagedCatches } from "./PagedCatches";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { TallyBars } from "./TallyBars";
import { WaterTipsBox } from "./WaterTipsBox";
import { exactTerm, findWithLink } from "./findLinks";
import { SpeciesChips } from "./SpeciesChips";
import { daysBetween, lastOutByWater, spotsByLastFish } from "./spotOrder";
import { catchMonth } from "./tripMonths";
import { PagedTrips } from "./PagedTrips";
import { outingAverage, outingStreak, topOuting, weekendSplit } from "./outingAverage";
import { notYetThisYear } from "./bests/notYet";
import { mostKindsDay } from "./bests/mostKinds";
import { CopySummary } from "./CopySummary";
import { spotSummary } from "./summaries";
import { EditDelete } from "./EditDelete";
import { fishCountLabel, formatDay, messageText, outingName, outingNameById, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { locale, num, t, tn, useT } from "../i18n";
import { tempText } from "../i18n/content";
import { tempThroughYear } from "./waterTips";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { useKeptForm } from "./keptForm";
import { ChoiceRow } from "./ChoiceRow";
import { countedFish } from "./milestones";
import { PhotoStrip } from "./SpeciesPage";
import { formatCoord, placeFor } from "./map/places";
import { hookTally, hookText } from "./hookTally";
import { MonthBars } from "./MonthBars";
import { BiggestHere } from "./BiggestHere";
import { MergeWater } from "./MergeWater";
import { PLAY_LAKE_ID, upcomingOwnTrips } from "./playLake";

/** The soonest planned outing on a water, as the card says it. */
function nextOutingLine(trip: Trip | undefined, today: string, tomorrow: string): string | null {
  return trip ? t("Next outing: {when}", { when: tripWhen(trip.date, today, tomorrow) }) : null;
}

/** How the water list is ordered, kept for the next visit. */
type SpotOrder = "fish" | "name" | "most" | "rested";
const SPOT_ORDER_KEY = "stillwater.field-log.spot-order.v1";

function readSpotOrder(): SpotOrder {
  try {
    const stored = localStorage.getItem(SPOT_ORDER_KEY);
    return stored === "name" || stored === "most" || stored === "rested" ? stored : "fish";
  } catch {
    return "fish";
  }
}

export function SpotsPage() {
  const { book } = useLogbook();
  useT();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = upcomingOwnTrips(book, today);
  const [order, setOrder] = useState(readSpotOrder);
  const pickOrder = (next: SpotOrder) => {
    setOrder(next);
    try {
      localStorage.setItem(SPOT_ORDER_KEY, next);
    } catch {
      // Storage blocked: the order holds for this visit.
    }
  };
  // Last fish first by default, else by name or by the most fish; the game's lake last, as it is played, not fished.
  const rows = spotsByLastFish(book);
  if (order === "name") rows.sort((a, b) => a.spot.name.localeCompare(b.spot.name, locale()));
  if (order === "most") rows.sort((a, b) => b.fishCount - a.fishCount);
  // The water left alone longest first, to give a rested one a go; waters never fished after them.
  const lastOut = lastOutByWater(book, today);
  if (order === "rested") {
    rows.sort((a, b) => {
      const x = lastOut.get(a.spot.id);
      const y = lastOut.get(b.spot.id);
      return !x ? (y ? 1 : 0) : !y ? -1 : x < y ? -1 : x > y ? 1 : 0;
    });
  }
  rows.sort((a, b) => Number(a.spot.id === PLAY_LAKE_ID) - Number(b.spot.id === PLAY_LAKE_ID));

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Waters")}</p>
          <h1>{t("Spots")}</h1>
          <p className="lede">{t("The places you actually go back to, and the day they fish well.")}</p>
        </div>
        <Link to="/spots/new" className="field-primary inline">
          {t("Add a spot")}
        </Link>
      </header>
      {book.spots.length === 0 ? (
        <p className="empty">{t("No waters yet.")}</p>
      ) : (
        <>
        {rows.length > 2 ? (
          <div className="spot-order">
            <ChoiceRow<SpotOrder>
              wrap
              label={t("Order")}
              value={order}
              options={[
                { id: "fish", label: t("Last fish") },
                { id: "name", label: t("Name") },
                { id: "most", label: t("Most fish") },
                { id: "rested", label: t("Longest rested") },
              ]}
              onChange={pickOrder}
            />
          </div>
        ) : null}
        <div className="card-grid">
          {rows.map((row) => (
            <SpotCard
              key={row.spot.id}
              spot={row.spot}
              fishCount={row.fishCount}
              // Outings fished, as the water's own page counts them: not those still planned.
              tripCount={tripsForSpot(book, row.spot.id).filter((trip) => trip.date <= today).length}
              lastFishAt={row.lastFishAt}
              restDays={order === "rested" && lastOut.has(row.spot.id) ? daysBetween(lastOut.get(row.spot.id)!, today) : null}
              nextOuting={nextOutingLine(upcoming.find((trip) => trip.spotId === row.spot.id), today, tomorrow)}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}

export function SpotPage() {
  const { book, deleteSpot } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { spotId = "" } = useParams();
  const spot = spotById(book, spotId);
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);

  if (!spot) {
    return (
      <div className="sheet">
        <h1>{t("Missing water")}</h1>
        <p className="lede">{t("That spot is not in this book.")}</p>
        <Link to="/spots">{t("Back to spots")}</Link>
      </div>
    );
  }

  const trips = tripsForSpot(book, spot.id);
  const catches = catchesForSpot(book, spot.id);
  const fishByTrip = fishCountsByTrip({ ...book, catches });
  const hooks = hookTally(book, spot.id);
  const average = outingAverage(trips, (id) => fishByTrip.get(id) ?? 0, today);
  const top = topOuting(trips, (id) => fishByTrip.get(id) ?? 0, today);
  // A blank spell still running here, once the water has given a fish: whether to try elsewhere.
  // A fish here logged off its outing still ends a dry run: counted on the day it came.
  const looseByDay = new Map<string, number>();
  for (const entry of catches) if (!entry.tripId) looseByDay.set(localDate(new Date(entry.caughtAt)), (looseByDay.get(localDate(new Date(entry.caughtAt))) ?? 0) + 1);
  const dayOf = new Map(trips.map((trip) => [trip.id, trip.date]));
  const streak = outingStreak(trips, (id) => (fishByTrip.get(id) ?? 0) + (looseByDay.get(dayOf.get(id) ?? "") ?? 0), today);
  const split = weekendSplit(trips, (id) => fishByTrip.get(id) ?? 0, today);
  // Last year's kinds here still to come back, and the day this water gave the most kinds: as Bests says them for the book.
  const notYet = notYetThisYear(catches);
  const kindsDay = mostKindsDay({ ...book, catches });
  const here = exactTerm("water", spot.name);
  // This season here against last season up to the same date, once last season had begun by now. Today's outing
  // counts once it has a fish, as the average counts outings.
  const ownHere = countedFish(catches);
  const seasonSoFar = (year: string) => ({
    outings: trips.filter((trip) => trip.date.startsWith(`${year}-`) && trip.date.slice(5) <= today.slice(5) && (trip.date < today || (fishByTrip.get(trip.id) ?? 0) > 0)).length,
    fish: ownHere.filter((entry) => {
      const day = localDate(new Date(entry.caughtAt));
      return day.startsWith(`${year}-`) && day.slice(5) <= today.slice(5);
    }).length,
  });
  const thisSeason = seasonSoFar(today.slice(0, 4));
  const lastSeason = seasonSoFar(String(Number(today.slice(0, 4)) - 1));
  // The outings already fished, as the average counts them: a planned one has nothing to tell yet.
  const fishedOutings = trips.filter((trip) => trip.date < today || (trip.date === today && (fishByTrip.get(trip.id) ?? 0) > 0)).length;

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/spots/${spot.id}/edit`}
        ask={
          // How much goes with it, since a water with a season on it takes a lot.
          trips.length + catches.length === 0
            ? t("Delete this water?")
            : trips.length > 0 && catches.length > 0
              ? t("Delete this water? Its {outings} and {fish} leave the book too.", { outings: tn(trips.length, "{n} outing", "{n} outings"), fish: tn(catches.length, "{n} fish", "{n} fish") })
              : // Only outings or only fish: "and Nothing logged" would read mid-sentence.
                t("Delete this water? Also leaving the book: {what}.", { what: trips.length > 0 ? tn(trips.length, "{n} outing", "{n} outings") : tn(catches.length, "{n} fish", "{n} fish") })
        }
        onDelete={() => {
          if (deleteSpot(spot.id)) navigate("/spots");
        }}
        aside={
          // The game's lake fills itself as it is played; nothing to log or plan by hand.
          spot.id === PLAY_LAKE_ID ? undefined : (
            <Link to={`/catches/new?spot=${spot.id}`} className="field-primary inline">
              {t("Log a catch here")}
            </Link>
          )
        }
      >
        <p className="eyebrow">
          <Link to="/spots">{t("Spots")}</Link>
        </p>
        <h1>{spot.name}</h1>
        <span className={`stamp stamp-${spot.waterType}`}>{t(WATER_LABELS[spot.waterType])}</span>
        {spot.place ? (
          <p className="meta spot-place">
            {formatCoord(spot.place.lat, spot.place.lng)}{" "}
            <MapAnchor lat={spot.place.lat} lng={spot.place.lng}>
              {t("Open on a map")}
            </MapAnchor>
          </p>
        ) : placeFor(spot.id) || spot.id === PLAY_LAKE_ID ? null : (
          // A sample water already has its pin on the map; any other water with no place is offered one.
          <p className="meta spot-place">
            <Link to={`/spots/${spot.id}/edit#place`}>{t("Note where it is")}</Link>
          </p>
        )}
      </EditDelete>
      {spot.notes ? <p className="prose">{spot.notes}</p> : null}
      <aside className="conditions" aria-label={t("Best conditions")}>
        <span className="eyebrow">{t("Best conditions")}</span>
        <p>{spot.bestConditions || t("Not noted yet.")}</p>
      </aside>
      <WaterTipsBox catches={catches} on={today} within={exactTerm("water", spot.name)} place={spot.place ?? placeFor(spot.id)} />
      <TempThroughYear catches={catches} />
      {catches.length > 0 ? (
        <CopySummary
          text={() => spotSummary(spot, fishedOutings, catches, average, top ? { trip: top, fish: fishByTrip.get(top.id) ?? 0 } : null)}
          file="stillwater-water.txt"
        />
      ) : null}

      <div className="section-head">
        <h2>{t("Outings")}</h2>
        {spot.id === PLAY_LAKE_ID ? null : <Link to={`/trips/new?spot=${spot.id}`}>{t("Plan one")}</Link>}
      </div>
      {average ? <p className="meta">{average}</p> : null}
      {hooks ? <p className="meta">{hookText(hooks)}</p> : null}
      {split ? (
        <p className="meta weekend-split">{t("Fish an outing: {weekend} on weekends, {weekday} on weekdays.", { weekend: num(split.weekend), weekday: num(split.weekday) })}</p>
      ) : null}
      {spot.id !== PLAY_LAKE_ID && lastSeason.outings + lastSeason.fish > 0 ? (
        <p className="meta season-pace">
          {t("This year here: {outings}, {fish} · last year by now: {lastOutings}, {lastFish}", {
            outings: tn(thisSeason.outings, "{n} outing", "{n} outings"),
            // Counts in a sentence: "0 fish", not the "Nothing logged" a label says alone.
            fish: tn(thisSeason.fish, "{n} fish", "{n} fish"),
            lastOutings: tn(lastSeason.outings, "{n} outing", "{n} outings"),
            lastFish: tn(lastSeason.fish, "{n} fish", "{n} fish"),
          })}
        </p>
      ) : null}
      {streak.dryNow > 1 && streak.best > 0 ? <p className="meta dry-here">{t("Days out here since the last fish: {count}", { count: streak.dryNow })}</p> : null}
      {top ? (
        <p className="meta stand">
          {/* The best day here, opening that outing. */}
          {t("Best outing here:")} <Link to={`/trips/${top.id}`}>{`${outingName(top, book.spots)} · ${tripWhen(top.date, today, tomorrow)}`}</Link>, {fishCountLabel(fishByTrip.get(top.id) ?? 0)}
        </p>
      ) : null}
      {trips.length === 0 ? (
        <p className="empty">{t("No outings on this water yet.")}</p>
      ) : (
        <PagedTrips trips={trips} fishOn={(id) => fishByTrip.get(id) ?? 0} stack>
          {(trip) => (
            <TripCard
              level={4}
              key={trip.id}
              trip={trip}
              spotName={null}
              waterType={null}
              fishCount={fishByTrip.get(trip.id) ?? 0}
              today={today}
              tomorrow={tomorrow}
            />
          )}
        </PagedTrips>
      )}

      <div className="section-head">
        <h2>{t("Fish from this water")}</h2>
      </div>
      <FishSum catches={catches} />
      <SpeciesChips catches={catches} within={spot.name} />
      {notYet.length > 0 ? (
        <p className="meta not-yet">
          <span>
            {t("Not yet this year:")}{" "}
            {notYet.map((name, index) => (
              <Fragment key={name}>
                {index > 0 ? ", " : null}
                <Link to={findWithLink(here, exactTerm("species", t(name)))}>{t(name)}</Link>
              </Fragment>
            ))}
          </span>
        </p>
      ) : null}
      {kindsDay ? (
        <p className="meta most-kinds">
          <Link to={findWithLink(here, kindsDay.date)}>{t("Most kinds in one day: {count}, on {day}", { count: kindsDay.kinds, day: formatDay(kindsDay.date) })}</Link>
        </p>
      ) : null}
      <BiggestHere catches={catches} spotId={spot.id} />
      <PhotoStrip catches={catches} within={here} named list={`water:${spot.id}`} />
      <FishCsv catches={catches} name={spot.name} />
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("When it bites")}</h2>
          </div>
          <TallyBars key={spot.id} rows={biteTimes({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(here, exactTerm("time", t(row.label))) : undefined }))} />
        </>
      ) : null}
      <MonthBars catches={catches} within={exactTerm("water", spot.name)} />
      {catches.length === 0 ? (
        <p className="empty">{t("Nothing logged here yet.")}</p>
      ) : (
        <PagedCatches items={catches} monthOf={catchMonth}>
          {(entry) => (
            <CatchCard
              level={4}
              key={entry.id}
              entry={entry}
              spotName={null}
              tripTitle={entry.tripId ? outingNameById(book, entry.tripId) : null}
              list={`water:${spot.id}`}
            />
          )}
        </PagedCatches>
      )}
      <MergeWater spotId={spot.id} />
    </div>
  );
}

export function SpotFormPage() {
  const { spotId } = useParams();
  return <SpotForm key={spotId ?? ""} />;
}

function SpotForm() {
  const { book, storedBook, addSpot, updateSpot } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { spotId } = useParams();
  const existing = spotId ? spotById(book, spotId) : undefined;
  // Sent here to note where the water is (from the map, or its page): straight to the place field.
  const toPlace = useLocation().hash === "#place";
  // Sent from the catch or outing form of a book with no water yet: back there with the new water once it is saved.
  const [params] = useSearchParams();
  const then = existing ? null : params.get("then");
  const placeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // After the page's own scroll to the top has run.
    if (!toPlace) return;
    const frame = requestAnimationFrame(() => placeInput.current?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [toPlace]);
  const [name, setName] = useState(existing?.name ?? "");
  const [waterType, setWaterType] = useState<string>(existing?.waterType ?? "lake");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [bestConditions, setBestConditions] = useState(existing?.bestConditions ?? "");
  const [place, setPlace] = useState(existing?.place ? `${existing.place.lat}, ${existing.place.lng}` : "");
  const [locating, setLocating] = useState<"idle" | "busy" | "found" | "failed">("idle");
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [error, setError] = useState("");
  // Unsaved changes to a water in the book wait for the next visit to its form.
  const kept = useKeptForm(
    existing ? `spot:${existing.id}` : null,
    existing ? JSON.stringify(storedBook.spots.find((spot) => spot.id === existing.id) ?? existing) : "",
    { name, waterType, notes, bestConditions, place },
    (fields) => {
      setName(fields.name ?? "");
      if (fields.waterType) setWaterType(fields.waterType);
      setNotes(fields.notes ?? "");
      setBestConditions(fields.bestConditions ?? "");
      setPlace(fields.place ?? "");
    },
  );
  // Two waters with one name split their fish and outings; point at the one already in the book.
  const sameName = name.trim()
    ? book.spots.find((spot) => spot.id !== existing?.id && spot.name.trim().toLowerCase() === name.trim().toLowerCase())
    : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const draft = { name, waterType, notes, bestConditions, place };
    const result = existing ? updateSpot(existing.id, draft) : addSpot(draft);
    if (!result.ok) {
      setError(result.message);
      markInvalid(event.currentTarget as HTMLFormElement, result.field);
      return;
    }
    kept.drop();
    if (then === "catch") navigate(`/catches/new?spot=${result.id}`);
    else if (then === "trip") navigate(`/trips/new?spot=${result.id}`);
    else navigate(`/spots/${result.id}`);
  };

  if (spotId && !existing) {
    return (
      <div className="sheet">
        <h1>{t("Missing water")}</h1>
        <p className="lede">{t("That spot is not in this book.")}</p>
        <Link to="/spots">{t("Back to spots")}</Link>
      </div>
    );
  }

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{existing ? t("Edit water") : t("New water")}</p>
          <h1 data-title={existing ? t("Editing {name}", { name: existing.name }) : undefined}>{existing ? existing.name : t("Add a spot")}</h1>
        </div>
        <Link to={existing ? `/spots/${existing.id}` : "/spots"} onClick={kept.drop}>
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
            {t("Name")}
            <input name="name" maxLength={48} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Cedar Bend")} required />
          </label>
          {sameName ? (
            <p className="wide form-note" role="status">
              {t("This book already has a water by that name:")} <Link to={`/spots/${sameName.id}`}>{sameName.name}</Link>
            </p>
          ) : null}
          <fieldset>
            <legend>{t("Water type")}</legend>
            <ChoiceRow
              label={t("Water type")}
              value={waterType}
              options={WATER_TYPES.map((type) => ({ id: type, label: t(WATER_LABELS[type]) }))}
              onChange={setWaterType}
              wrap
            />
          </fieldset>
          <label className="wide">
            {t("Notes")}
            <textarea
              name="notes"
              maxLength={400}
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("Where the fish sit, and how you get there.")}
            />
          </label>
          <label className="wide">
            {t("Best conditions")}
            <input
              name="bestConditions"
              maxLength={160}
              value={bestConditions}
              onChange={(event) => setBestConditions(event.target.value)}
              placeholder={t("Overcast, light west wind")}
            />
          </label>
          <label className="wide">
            {t("Place, latitude then longitude (optional)")}
            <input
              ref={placeInput}
              name="place"
              autoFocus={toPlace}
              autoComplete="off"
              value={place}
              onChange={(event) => {
                setPlace(event.target.value);
                setLocating("idle");
              }}
              // An example place near the reader: a north-woods lake in English, a Masurian one in Polish.
              placeholder={t("46.85, -94.24")}
            />
          </label>
          {canLocate ? (
            <p className="wide form-note">
              <button
                type="button"
                className="text-button"
                aria-disabled={locating === "busy" ? true : undefined}
                onClick={(event) => {
                  if (locating === "busy") return;
                  const form = event.currentTarget.form;
                  setLocating("busy");
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setPlace(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
                      setLocating("found");
                      // Filled in by the page rather than typed, so the form's own clearing doesn't run.
                      setError("");
                      if (form) clearInvalid(form);
                    },
                    () => setLocating("failed"),
                    { enableHighAccuracy: true, timeout: 15000 },
                  );
                }}
              >
                {locating === "busy" ? t("Finding you…") : t("Use where I am")}
              </button>
              <span role="status">
                {locating === "failed" ? ` ${t("The browser didn't give a place.")}` : locating === "found" ? ` ${t("Place filled in.")}` : ""}
              </span>
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="field-error" role="alert" id={FORM_ERROR_ID}>
            {messageText(error)}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline">
          {existing ? t("Save changes") : t("Save spot")}
        </button>
      </form>
    </div>
  );
}

/** "Water temperature in 2026: Apr 20 52°F → Jun 3 64°F → Sep 9 58°F", from the readings noted with fish. */
function TempThroughYear({ catches }: { catches: readonly CatchEntry[] }) {
  useT();
  const readings = tempThroughYear(catches);
  if (readings.length === 0) return null;
  // The month written out, so Polish takes its "of" form ("16 maja").
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale(), { month: "long", day: "numeric" });
  return (
    <p className="meta temp-year">
      {t("Water temperature in {year}: {readings}", {
        year: new Date(readings[0]!.at).getFullYear(),
        readings: readings.map((reading) => `${day(reading.at)}: ${tempText(reading.fahrenheit)}`).join(" → "),
      })}
    </p>
  );
}
