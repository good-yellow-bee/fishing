import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  WATER_LABELS,
  WATER_TYPES,
  catchesForSpot,
  fishCountsByTrip,
  localDate,
  shiftDate,
  spotById,
  tripById,
  tripsForSpot,
  upcomingTrips,
  type Trip,
} from "@stillwater/shared";
import { CatchCard, SpotCard, TripCard } from "./cards";
import { PagedCatches } from "./PagedCatches";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { WaterTipsBox } from "./WaterTipsBox";
import { exactTerm } from "./findLinks";
import { SpeciesChips } from "./SpeciesChips";
import { spotsByLastFish } from "./spotOrder";
import { catchMonth } from "./tripMonths";
import { PagedTrips } from "./PagedTrips";
import { outingAverage, topOuting } from "./outingAverage";
import { CopySummary } from "./CopySummary";
import { spotSummary } from "./summaries";
import { EditDelete } from "./EditDelete";
import { fishCountLabel, messageText, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { t, useT } from "../i18n";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { ChoiceRow } from "./ChoiceRow";
import { formatCoord, placeFor } from "./map/places";
import { osmLink } from "./osmLink";
import { hookTally, hookText } from "./hookTally";

/** The soonest planned outing on a water, as the card says it. */
function nextOutingLine(trip: Trip | undefined, today: string, tomorrow: string): string | null {
  return trip ? t("Next outing: {when}", { when: tripWhen(trip.date, today, tomorrow) }) : null;
}

export function SpotsPage() {
  const { book } = useLogbook();
  useT();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = upcomingTrips(book, today);

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
        <div className="card-grid">
          {spotsByLastFish(book).map((row) => (
            <SpotCard
              key={row.spot.id}
              spot={row.spot}
              fishCount={row.fishCount}
              tripCount={tripsForSpot(book, row.spot.id).length}
              lastFishAt={row.lastFishAt}
              nextOuting={nextOutingLine(upcoming.find((trip) => trip.spotId === row.spot.id), today, tomorrow)}
            />
          ))}
        </div>
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
  // The outings already fished, as the average counts them: a planned one has nothing to tell yet.
  const fishedOutings = trips.filter((trip) => trip.date < today || (trip.date === today && (fishByTrip.get(trip.id) ?? 0) > 0)).length;

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/spots/${spot.id}/edit`}
        ask={t("Delete this water? Its outings and fish leave the book too.")}
        onDelete={() => {
          if (deleteSpot(spot.id)) navigate("/spots");
        }}
        aside={
          <Link to={`/catches/new?spot=${spot.id}`} className="field-primary inline">
            {t("Log a catch here")}
          </Link>
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
            <a href={osmLink(spot.place.lat, spot.place.lng)} target="_blank" rel="noreferrer">
              {t("Open on a map")}
            </a>
          </p>
        ) : placeFor(spot.id) ? null : (
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
      <WaterTipsBox catches={catches} on={today} within={exactTerm("water", spot.name)} />
      {catches.length > 0 ? (
        <CopySummary
          text={() => spotSummary(spot, fishedOutings, catches, average, top ? { trip: top, fish: fishByTrip.get(top.id) ?? 0 } : null)}
          file="stillwater-water.txt"
        />
      ) : null}

      <div className="section-head">
        <h2>{t("Outings")}</h2>
        <Link to={`/trips/new?spot=${spot.id}`}>{t("Plan one")}</Link>
      </div>
      {average ? <p className="meta">{average}</p> : null}
      {hooks ? <p className="meta">{hookText(hooks)}</p> : null}
      {top ? (
        <p className="meta stand">
          {/* The best day here, opening that outing. */}
          {t("Best outing here:")} <Link to={`/trips/${top.id}`}>{`${top.title} · ${tripWhen(top.date, today, tomorrow)}`}</Link>, {fishCountLabel(fishByTrip.get(top.id) ?? 0)}
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
      <FishCsv catches={catches} name={spot.name} />
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
              tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
            />
          )}
        </PagedCatches>
      )}
    </div>
  );
}

export function SpotFormPage() {
  const { spotId } = useParams();
  return <SpotForm key={spotId ?? ""} />;
}

function SpotForm() {
  const { book, addSpot, updateSpot } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { spotId } = useParams();
  const existing = spotId ? spotById(book, spotId) : undefined;
  // Sent here to note where the water is (from the map, or its page): straight to the place field.
  const toPlace = useLocation().hash === "#place";
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
    navigate(`/spots/${result.id}`);
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
        <Link to={existing ? `/spots/${existing.id}` : "/spots"}>{t("Cancel")}</Link>
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
              placeholder="46.85, -94.24"
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
