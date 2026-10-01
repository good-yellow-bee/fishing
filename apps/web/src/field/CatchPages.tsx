import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FISH,
  SKIES,
  SKY_LABELS,
  WINDS,
  WIND_LABELS,
  catchesNewestFirst,
  formatMeasure,
  formatWeather,
  spotById,
  tripById,
  tripsForSpot,
  type CatchDraft,
} from "@stillwater/shared";
import { CatchCard } from "./cards";
import { formatClock, formatDay, toLocalInput } from "./format";
import { useLogbook } from "./LogbookState";

const SPECIES = [...FISH].map((fish) => fish.name).sort((a, b) => a.localeCompare(b));

const BAITS = [
  "#5 Mepps",
  "Woolly bugger",
  "Pheasant tail",
  "Green pumpkin tube",
  "Crayfish crank",
  "Popper",
  "Nightcrawler",
  "Elk hair caddis",
  "Spinnerbait",
  "Senko",
];

export function CatchesPage() {
  const { book } = useLogbook();
  const catches = catchesNewestFirst(book);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">Catch log</p>
          <h1>Fish</h1>
          <p className="lede">Species, what was on the hook, the water, the hour, and the weather.</p>
        </div>
        <Link to="/catches/new" className="field-primary inline">
          Log a catch
        </Link>
      </header>
      {catches.length === 0 ? (
        <p className="empty">Nothing landed in the book yet.</p>
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
    </div>
  );
}

export function CatchFormPage() {
  const { book, addCatch } = useLogbook();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetTrip = tripById(book, params.get("trip") ?? "");
  const presetSpot = presetTrip?.spotId ?? params.get("spot") ?? book.spots[0]?.id ?? "";

  const [species, setSpecies] = useState("");
  const [measureKind, setMeasureKind] = useState<CatchDraft["measureKind"]>("length");
  const [amount, setAmount] = useState("");
  const [lure, setLure] = useState("");
  const [spotId, setSpotId] = useState(presetSpot);
  const [tripId, setTripId] = useState(presetTrip?.id ?? "");
  const [caughtAt, setCaughtAt] = useState(() => toLocalInput(new Date()));
  const [note, setNote] = useState("");
  const [sky, setSky] = useState("");
  const [wind, setWind] = useState("");
  const [waterTemp, setWaterTemp] = useState("");
  const [error, setError] = useState("");

  const spotTrips = tripsForSpot(book, spotId);
  const heading = presetTrip ? presetTrip.title : "Log a catch";

  const onSpot = (nextSpot: string) => {
    setSpotId(nextSpot);
    if (tripId && !tripsForSpot(book, nextSpot).some((trip) => trip.id === tripId)) setTripId("");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = addCatch({
      species,
      measureKind,
      amount,
      lure,
      spotId,
      tripId,
      caughtAt,
      note,
      sky,
      wind,
      waterTemp,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(tripId ? `/trips/${tripId}` : "/catches");
  };

  if (book.spots.length === 0) {
    return (
      <div className="sheet">
        <h1>Log a catch</h1>
        <p className="lede">Add a spot first, then the fish has a water to belong to.</p>
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
          <p className="eyebrow">New entry</p>
          <h1>{heading}</h1>
        </div>
        <Link to={tripId ? `/trips/${tripId}` : "/catches"}>Cancel</Link>
      </header>
      <form className="entry-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="wide">
            Species
            <input
              name="species"
              list="species-list"
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              placeholder="Yellow perch"
              autoComplete="off"
              required
            />
            <datalist id="species-list">
              {SPECIES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <fieldset className="wide">
            <legend>Measure</legend>
            <div className="choice-row" role="radiogroup" aria-label="Length or weight">
              <button
                type="button"
                role="radio"
                aria-checked={measureKind === "length"}
                className={measureKind === "length" ? "on" : ""}
                onClick={() => setMeasureKind("length")}
              >
                Length
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={measureKind === "weight"}
                className={measureKind === "weight" ? "on" : ""}
                onClick={() => setMeasureKind("weight")}
              >
                Weight
              </button>
            </div>
            <input
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={measureKind === "length" ? "Inches" : "Pounds"}
              aria-label={measureKind === "length" ? "Length in inches" : "Weight in pounds"}
              required
            />
          </fieldset>

          <label>
            Lure or bait
            <input
              name="lure"
              list="bait-list"
              value={lure}
              onChange={(event) => setLure(event.target.value)}
              placeholder="Woolly bugger"
              autoComplete="off"
              required
            />
            <datalist id="bait-list">
              {BAITS.map((bait) => (
                <option key={bait} value={bait} />
              ))}
            </datalist>
          </label>

          <label>
            Water
            <select name="spot" value={spotId} onChange={(event) => onSpot(event.target.value)}>
              {book.spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Time
            <input
              name="caughtAt"
              type="datetime-local"
              value={caughtAt}
              onChange={(event) => setCaughtAt(event.target.value)}
              required
            />
          </label>

          <label>
            Outing
            <select name="trip" value={tripId} onChange={(event) => setTripId(event.target.value)}>
              <option value="">Not on a trip</option>
              {spotTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {formatDay(trip.date)} · {trip.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sky
            <select name="sky" value={sky} onChange={(event) => setSky(event.target.value)} required>
              <option value="">Choose</option>
              {SKIES.map((option) => (
                <option key={option} value={option}>
                  {SKY_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Wind
            <select name="wind" value={wind} onChange={(event) => setWind(event.target.value)} required>
              <option value="">Choose</option>
              {WINDS.map((option) => (
                <option key={option} value={option}>
                  {WIND_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Water °F
            <input
              name="waterTemp"
              inputMode="decimal"
              value={waterTemp}
              onChange={(event) => setWaterTemp(event.target.value)}
              placeholder="58"
              aria-label="Water temperature in Fahrenheit"
              required
            />
          </label>

          <label className="wide">
            Note
            <textarea
              name="note"
              rows={3}
              value={note}
              maxLength={280}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Where it hit, and what you would repeat."
            />
          </label>
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline">
          Save to the book
        </button>
      </form>
    </div>
  );
}

export function CatchPage() {
  const { book } = useLogbook();
  const { catchId = "" } = useParams();
  const entry = book.catches.find((row) => row.id === catchId);

  if (!entry) {
    return (
      <div className="sheet">
        <h1>Missing fish</h1>
        <p className="lede">That catch is not in this book.</p>
        <Link to="/catches">Back to catches</Link>
      </div>
    );
  }

  const spot = spotById(book, entry.spotId);
  const trip = entry.tripId ? tripById(book, entry.tripId) : undefined;

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">
            <Link to="/catches">Catches</Link>
          </p>
          <h1>{entry.species}</h1>
          <p className="meta stand">
            <span>{formatMeasure(entry.measure)}</span>
            {" · "}
            <span>{entry.lure}</span>
            {spot ? (
              <>
                {" · "}
                <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
              </>
            ) : null}
            {" · "}
            <time dateTime={entry.caughtAt}>{formatClock(entry.caughtAt)}</time>
          </p>
        </div>
      </header>
      {entry.weather ? (
        <aside className="conditions" aria-label="Weather">
          <span className="eyebrow">Weather</span>
          <p>{formatWeather(entry.weather)}</p>
        </aside>
      ) : null}
      {entry.note ? <p className="prose">{entry.note}</p> : null}
      {trip ? (
        <p className="trip-link">
          <Link to={`/trips/${trip.id}`}>{trip.title}</Link>
        </p>
      ) : null}
    </div>
  );
}
