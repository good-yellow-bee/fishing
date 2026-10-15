import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { WaterTipsBox } from "./WaterTipsBox";
import { SpeciesChips } from "./SpeciesChips";
import { spotsByLastFish } from "./spotOrder";
import { catchMonth } from "./tripMonths";
import { PagedTrips } from "./PagedTrips";
import { EditDelete } from "./EditDelete";
import { messageText, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { t, useT } from "../i18n";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { ChoiceRow } from "./ChoiceRow";

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

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/spots/${spot.id}/edit`}
        ask={t("Delete this water? Its outings and fish leave the book too.")}
        onDelete={() => {
          deleteSpot(spot.id);
          navigate("/spots");
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
      </EditDelete>
      {spot.notes ? <p className="prose">{spot.notes}</p> : null}
      <aside className="conditions" aria-label={t("Best conditions")}>
        <span className="eyebrow">{t("Best conditions")}</span>
        <p>{spot.bestConditions || t("Not noted yet.")}</p>
      </aside>
      <WaterTipsBox catches={catches} on={today} within={spot.name} />

      <div className="section-head">
        <h2>{t("Outings")}</h2>
        <Link to={`/trips/new?spot=${spot.id}`}>{t("Plan one")}</Link>
      </div>
      {trips.length === 0 ? (
        <p className="empty">{t("No outings on this water yet.")}</p>
      ) : (
        <PagedTrips trips={trips} fishOn={(id) => fishByTrip.get(id) ?? 0} stack>
          {(trip) => (
            <TripCard
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
  const [name, setName] = useState(existing?.name ?? "");
  const [waterType, setWaterType] = useState<string>(existing?.waterType ?? "lake");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [bestConditions, setBestConditions] = useState(existing?.bestConditions ?? "");
  const [error, setError] = useState("");
  // Two waters with one name split their fish and outings; point at the one already in the book.
  const sameName = name.trim()
    ? book.spots.find((spot) => spot.id !== existing?.id && spot.name.trim().toLowerCase() === name.trim().toLowerCase())
    : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const draft = { name, waterType, notes, bestConditions };
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
          <h1>{existing ? existing.name : t("Add a spot")}</h1>
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
