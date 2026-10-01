import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  WATER_LABELS,
  WATER_TYPES,
  catchesForSpot,
  localDate,
  shiftDate,
  spotById,
  tripById,
  tripsForSpot,
} from "@stillwater/shared";
import { CatchCard, SpotCard, TripCard } from "./cards";
import { EditDelete } from "./EditDelete";
import { useLogbook } from "./LogbookState";

export function SpotsPage() {
  const { book } = useLogbook();

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">Waters</p>
          <h1>Spots</h1>
          <p className="lede">The places you actually go back to, and the day they fish well.</p>
        </div>
        <Link to="/spots/new" className="field-primary inline">
          Add a spot
        </Link>
      </header>
      {book.spots.length === 0 ? (
        <p className="empty">No waters yet.</p>
      ) : (
        <div className="card-grid">
          {book.spots.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot}
              fishCount={catchesForSpot(book, spot.id).length}
              tripCount={tripsForSpot(book, spot.id).length}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SpotPage() {
  const { book, deleteSpot } = useLogbook();
  const navigate = useNavigate();
  const { spotId = "" } = useParams();
  const spot = spotById(book, spotId);
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);

  if (!spot) {
    return (
      <div className="sheet">
        <h1>Missing water</h1>
        <p className="lede">That spot is not in this book.</p>
        <Link to="/spots">Back to spots</Link>
      </div>
    );
  }

  const trips = tripsForSpot(book, spot.id);
  const catches = catchesForSpot(book, spot.id);

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/spots/${spot.id}/edit`}
        ask="Delete this water? Its outings and fish leave the book too."
        onDelete={() => {
          deleteSpot(spot.id);
          navigate("/spots");
        }}
        aside={
          <Link to={`/catches/new?spot=${spot.id}`} className="field-primary inline">
            Log a catch here
          </Link>
        }
      >
        <p className="eyebrow">
          <Link to="/spots">Spots</Link>
        </p>
        <h1>{spot.name}</h1>
        <span className={`stamp stamp-${spot.waterType}`}>{WATER_LABELS[spot.waterType]}</span>
      </EditDelete>
      {spot.notes ? <p className="prose">{spot.notes}</p> : null}
      <aside className="conditions">
        <span className="eyebrow">Best conditions</span>
        <p>{spot.bestConditions || "Not noted yet."}</p>
      </aside>

      <div className="section-head">
        <h2>Outings</h2>
        <Link to={`/trips/new?spot=${spot.id}`}>Plan one</Link>
      </div>
      {trips.length === 0 ? (
        <p className="empty">No outings on this water yet.</p>
      ) : (
        <div className="stack">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              spotName={spot.name}
              waterType={spot.waterType}
              fishCount={catches.filter((entry) => entry.tripId === trip.id).length}
              today={today}
              tomorrow={tomorrow}
            />
          ))}
        </div>
      )}

      <div className="section-head">
        <h2>Fish from this water</h2>
      </div>
      {catches.length === 0 ? (
        <p className="empty">Nothing logged here yet.</p>
      ) : (
        <div className="stack">
          {catches.map((entry) => (
            <CatchCard
              key={entry.id}
              entry={entry}
              spotName={spot.name}
              tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SpotFormPage() {
  const { book, addSpot, updateSpot } = useLogbook();
  const navigate = useNavigate();
  const { spotId } = useParams();
  const existing = spotId ? spotById(book, spotId) : undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [waterType, setWaterType] = useState<string>(existing?.waterType ?? "lake");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [bestConditions, setBestConditions] = useState(existing?.bestConditions ?? "");
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const draft = { name, waterType, notes, bestConditions };
    const result = existing ? updateSpot(existing.id, draft) : addSpot(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(`/spots/${result.id}`);
  };

  if (spotId && !existing) {
    return (
      <div className="sheet">
        <h1>Missing water</h1>
        <p className="lede">That spot is not in this book.</p>
        <Link to="/spots">Back to spots</Link>
      </div>
    );
  }

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{existing ? "Edit water" : "New water"}</p>
          <h1>{existing ? existing.name : "Add a spot"}</h1>
        </div>
        <Link to={existing ? `/spots/${existing.id}` : "/spots"}>Cancel</Link>
      </header>
      <form className="entry-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Name
            <input name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Cedar Bend" required />
          </label>
          <fieldset>
            <legend>Water type</legend>
            <div className="choice-row wrap" role="radiogroup" aria-label="Water type">
              {WATER_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={waterType === type}
                  className={waterType === type ? "on" : ""}
                  onClick={() => setWaterType(type)}
                >
                  {WATER_LABELS[type]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="wide">
            Notes
            <textarea
              name="notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Where the fish sit, and how you get there."
            />
          </label>
          <label className="wide">
            Best conditions
            <input
              name="bestConditions"
              value={bestConditions}
              onChange={(event) => setBestConditions(event.target.value)}
              placeholder="Overcast, light west wind"
            />
          </label>
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline">
          {existing ? "Save changes" : "Save spot"}
        </button>
      </form>
    </div>
  );
}
