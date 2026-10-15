import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CATCH_PHOTO_MAX_BYTES,
  FISH,
  SKIES,
  SKY_LABELS,
  WINDS,
  WIND_LABELS,
  catchesForSpot,
  catchesNewestFirst,
  spotById,
  tripById,
  tripsForSpot,
  type CatchDraft,
  type CatchEntry,
} from "@stillwater/shared";
import { CatchCard } from "./cards";
import { catchNeighbors } from "./catchNeighbors";
import { catchBadge } from "./catchBadge";
import { anotherCatchLink } from "./anotherCatch";
import { saveShareCard, shareCardFileName } from "../game/shareCard";
import { EditDelete } from "./EditDelete";
import { PagedCatches } from "./PagedCatches";
import { bookLures, lastMeasureKind, ownFirst, startTimeFor, tripLure, tripWeather } from "./suggestions";
import { waterTips } from "./waterTips";
import { fromBookAmount, fromBookTemp, toBookAmount, toBookTemp, unitsMessage } from "./unitsInput";
import { getUnits, locale, t, useT, type Units } from "../i18n";
import { measureText, weatherText } from "../i18n/content";
import { formatClock, formatDay, messageText, noteText, toLocalInput } from "./format";
import { useLogbook } from "./LogbookState";
import { compressCatchPhoto } from "./photoFile";
import { dropKeptDraft, keepDraft, readKeptDraft, type KeptDraft } from "./catchDraft";

function amountText(entry: CatchEntry, units: Units): string {
  return entry.measure.kind === "length"
    ? fromBookAmount(entry.measure.inches, "length", units)
    : fromBookAmount(entry.measure.pounds, "weight", units);
}

const SPECIES = [...FISH].map((fish) => fish.name);

/** A fish name from the shared list; its Polish line lives with the other fish names. */
const SPECIES_HINT = "Yellow perch";

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

/**
 * The book keeps fish and bait under their English names, so a list pick made
 * in Polish is filed under the same name as one made in English.
 */
function bookName(typed: string, names: readonly string[]): string {
  const clean = typed.trim().toLowerCase();
  return names.find((name) => t(name).toLowerCase() === clean) ?? typed;
}

export function CatchesPage() {
  const { book, photos } = useLogbook();
  useT();
  const catches = catchesNewestFirst(book);
  const photoCount = catches.filter((entry) => photos[entry.id]).length;

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Catch log")}</p>
          <h1>{t("Fish")}</h1>
          <p className="lede">{t("Species, what was on the hook, the water, the hour, the weather, and a photo if you kept one.")}</p>
        </div>
        <div className="sheet-actions">
          {photoCount > 0 ? <Link to="/photos">{t("Photos ({count})", { count: photoCount })}</Link> : null}
          <Link to="/catches/new" className="field-primary inline">
            {t("Log a catch")}
          </Link>
        </div>
      </header>
      {catches.length === 0 ? (
        <p className="empty">{t("Nothing landed in the book yet.")}</p>
      ) : (
        <PagedCatches items={catches}>
          {(entry) => (
            <CatchCard
              key={entry.id}
              entry={entry}
              spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
              tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
            />
          )}
        </PagedCatches>
      )}
    </div>
  );
}

export function CatchFormPage() {
  const { catchId } = useParams();
  const [params] = useSearchParams();
  return <CatchForm key={`${catchId ?? ""}:${params.toString()}`} />;
}

function CatchForm() {
  const { book, addCatch, updateCatch, photoFor } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { catchId } = useParams();
  const [params] = useSearchParams();
  const existing = catchId ? book.catches.find((row) => row.id === catchId) : undefined;
  const presetTrip = existing ? undefined : tripById(book, params.get("trip") ?? "");
  const presetSpot = existing?.spotId ?? presetTrip?.spotId ?? params.get("spot") ?? book.spots[0]?.id ?? "";

  const asked = params.get("kind");
  const presetKind = asked === "weight" || asked === "length" ? asked : lastMeasureKind(book);
  const [species, setSpecies] = useState(existing ? t(existing.species) : t(params.get("species") ?? ""));
  const [measureKind, setMeasureKind] = useState<CatchDraft["measureKind"]>(existing?.measure.kind ?? presetKind);
  // The form reads and writes in the units the player picked; the book keeps imperial.
  const units = getUnits();
  const [startAmount] = useState(() => (existing ? amountText(existing, units) : ""));
  const [amount, setAmount] = useState(startAmount);
  const [lure, setLure] = useState(() => t(existing ? existing.lure : (params.get("lure") ?? tripLure(book, presetTrip?.id))));
  const [spotId, setSpotId] = useState(presetSpot);
  const [tripId, setTripId] = useState(existing ? (existing.tripId ?? "") : (presetTrip?.id ?? ""));
  const [caughtAt, setCaughtAt] = useState(() =>
    existing ? toLocalInput(new Date(existing.caughtAt)) : toLocalInput(startTimeFor(presetTrip)),
  );
  // Until the player sets the time themselves, picking an outing moves the catch to its day.
  const [timeTouched, setTimeTouched] = useState(Boolean(existing));
  const [note, setNote] = useState(existing?.note ?? "");
  const [sky, setSky] = useState(existing?.weather?.sky ?? "");
  const [wind, setWind] = useState(existing?.weather?.wind ?? "");
  const [startTemp] = useState(() => (existing?.weather ? fromBookTemp(existing.weather.waterTempF, units) : ""));
  const [waterTemp, setWaterTemp] = useState(startTemp);
  // Conditions are optional, but once one is noted the other two are needed.
  const weatherStarted = Boolean(sky || wind || waterTemp.trim());
  const [photo, setPhoto] = useState<string | null>(existing ? photoFor(existing.id) : null);
  const [photoError, setPhotoError] = useState("");
  const [reducing, setReducing] = useState(false);
  const [error, setError] = useState("");
  const photoPick = useRef(0);
  // A new fish typed but never saved waits here until it is picked up or let go.
  const [waiting, setWaiting] = useState<KeptDraft | null>(() => (existing ? null : readKeptDraft()));

  // What the form opened with (presets from a trip or Log another), so untouched presets aren't kept.
  const opened = useRef<string | null>(null);

  useEffect(() => {
    // While an older draft waits, keep it rather than overwrite it with this one.
    if (existing || waiting) return;
    const fields = { species, measureKind, amount, lure, spotId, tripId, note, sky, wind, waterTemp };
    const now = JSON.stringify(fields);
    if (opened.current === null) opened.current = now;
    if (now === opened.current) {
      dropKeptDraft();
      return;
    }
    keepDraft({
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
      timeTouched,
      units,
      savedAt: new Date().toISOString(),
    });
  }, [existing, waiting, species, measureKind, amount, lure, spotId, tripId, caughtAt, note, sky, wind, waterTemp, timeTouched, units]);

  const pickUp = (kept: KeptDraft) => {
    const keptSpot = book.spots.some((spot) => spot.id === kept.spotId) ? kept.spotId : spotId;
    const keptTrip = tripsForSpot(book, keptSpot).some((trip) => trip.id === kept.tripId) ? kept.tripId : "";
    setSpecies(kept.species);
    setMeasureKind(kept.measureKind);
    setLure(kept.lure);
    setSpotId(keptSpot);
    setTripId(keptTrip);
    setCaughtAt(kept.caughtAt);
    setTimeTouched(kept.timeTouched);
    setNote(kept.note);
    setSky(kept.sky);
    setWind(kept.wind);
    // Numbers typed in other units would mean something else now.
    if (kept.units === units) {
      setAmount(kept.amount);
      setWaterTemp(kept.waterTemp);
    }
    // Picked up counts as typed: it stays kept even before the next keystroke.
    opened.current = "";
    setWaiting(null);
  };

  const spotTrips = tripsForSpot(book, spotId);
  const hereLures = (waterTips(catchesForSpot(book, spotId))?.lures ?? []).map((row) => t(row.lure));
  const heading = existing ? t(existing.species) : presetTrip ? presetTrip.title : t("Log a catch");

  const onSpot = (nextSpot: string) => {
    setSpotId(nextSpot);
    if (tripId && !tripsForSpot(book, nextSpot).some((trip) => trip.id === tripId)) setTripId("");
  };

  const pickedTrip = tripId ? tripById(book, tripId) : undefined;
  const outingWeather = tripWeather(book, tripId, existing?.id);

  const onTrip = (nextTrip: string) => {
    setTripId(nextTrip);
    if (!timeTouched) setCaughtAt(toLocalInput(startTimeFor(tripById(book, nextTrip))));
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const ticket = photoPick.current + 1;
    photoPick.current = ticket;
    setReducing(true);
    setPhotoError("");
    void compressCatchPhoto(file).then(
      (result) => {
        if (photoPick.current !== ticket) return;
        setReducing(false);
        if (!result.ok) {
          setPhotoError(result.message);
          return;
        }
        setPhoto(result.dataUrl);
      },
      () => {
        if (photoPick.current !== ticket) return;
        setReducing(false);
        setPhotoError(t("That photo could not be read. Choose a JPEG, PNG, or WebP."));
      },
    );
  };

  const clearPhoto = () => {
    photoPick.current += 1;
    setReducing(false);
    setPhoto(null);
    setPhotoError("");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (reducing) {
      setError(t("Wait for the photo to finish reducing."));
      return;
    }
    const draft: CatchDraft = {
      species: bookName(species, existing ? [existing.species, ...SPECIES] : SPECIES),
      measureKind,
      // An untouched number keeps its stored value, so a metric round trip doesn't nudge it.
      amount:
        existing && amount === startAmount && measureKind === existing.measure.kind
          ? amountText(existing, "imperial")
          : toBookAmount(amount, measureKind, units),
      lure: bookName(lure, [...(existing ? [existing.lure] : []), ...bookLures(book), ...BAITS]),
      spotId,
      tripId,
      caughtAt,
      note,
      sky,
      wind,
      waterTemp: existing?.weather && waterTemp === startTemp ? String(existing.weather.waterTempF) : toBookTemp(waterTemp, units),
    };
    const result = existing ? updateCatch(existing.id, draft, photo) : addCatch(draft, photo);
    if (!result.ok) {
      setError(unitsMessage(result.message, units));
      return;
    }
    if (existing) {
      navigate(`/catches/${existing.id}`);
      return;
    }
    // The waiting draft, if any, stays for later; this one is saved.
    if (!waiting) dropKeptDraft();
    navigate(tripId ? `/trips/${tripId}` : "/catches");
  };

  if (catchId && !existing) {
    return (
      <div className="sheet">
        <h1>{t("Missing fish")}</h1>
        <p className="lede">{t("That catch is not in this book.")}</p>
        <Link to="/catches">{t("Back to catches")}</Link>
      </div>
    );
  }

  if (!existing && book.spots.length === 0) {
    return (
      <div className="sheet">
        <h1>{t("Log a catch")}</h1>
        <p className="lede">{t("Add a spot first, then the fish has a water to belong to.")}</p>
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
          <p className="eyebrow">{existing ? t("Edit entry") : t("New entry")}</p>
          <h1>{heading}</h1>
        </div>
        <Link to={existing ? `/catches/${existing.id}` : tripId ? `/trips/${tripId}` : "/catches"}>{t("Cancel")}</Link>
      </header>
      {waiting ? (
        <div className="kept-draft" role="status">
          <p>
            {waiting.species.trim()
              ? t("A fish you started logging was not saved: {species}.", { species: waiting.species.trim() })
              : t("A fish you started logging was not saved.")}
          </p>
          <button type="button" className="field-primary inline" onClick={() => pickUp(waiting)}>
            {t("Pick it up")}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              dropKeptDraft();
              setWaiting(null);
            }}
          >
            {t("Let it go")}
          </button>
        </div>
      ) : null}
      <form className="entry-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="wide">
            {t("Species")}
            <input
              name="species"
              list="species-list"
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              placeholder={t(SPECIES_HINT)}
              autoComplete="off"
              required
            />
            <datalist id="species-list">
              {ownFirst(
                book.catches.map((entry) => entry.species),
                SPECIES,
                t,
              )
                .sort((a, b) => a.localeCompare(b))
                .map((name) => (
                  <option key={name} value={name} />
                ))}
            </datalist>
          </label>

          <fieldset className="wide">
            <legend>{t("Measure")}</legend>
            <div className="choice-row" role="radiogroup" aria-label={t("Length or weight")}>
              <button
                type="button"
                role="radio"
                aria-checked={measureKind === "length"}
                className={measureKind === "length" ? "on" : ""}
                onClick={() => setMeasureKind("length")}
              >
                {t("Length")}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={measureKind === "weight"}
                className={measureKind === "weight" ? "on" : ""}
                onClick={() => setMeasureKind("weight")}
              >
                {t("Weight")}
              </button>
            </div>
            <input
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={
                units === "metric"
                  ? measureKind === "length"
                    ? t("Centimetres")
                    : t("Kilograms")
                  : measureKind === "length"
                    ? t("Inches")
                    : t("Pounds")
              }
              aria-label={
                units === "metric"
                  ? measureKind === "length"
                    ? t("Length in centimetres")
                    : t("Weight in kilograms")
                  : measureKind === "length"
                    ? t("Length in inches")
                    : t("Weight in pounds")
              }
              required
            />
          </fieldset>

          <label>
            {t("Lure or bait")}
            <input
              name="lure"
              list="bait-list"
              value={lure}
              onChange={(event) => setLure(event.target.value)}
              placeholder={t(BAITS[1])}
              autoComplete="off"
              required
            />
            <datalist id="bait-list">
              {ownFirst(bookLures(book), BAITS, t).map((bait) => (
                <option key={bait} value={bait} />
              ))}
            </datalist>
          </label>
          {hereLures.length > 0 ? (
            <p className="wide form-note lure-tips">
              {t("Works on this water:")}{" "}
              {hereLures.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="lure-tip"
                  aria-pressed={lure === name}
                  onClick={() => setLure(name)}
                >
                  {name}
                </button>
              ))}
            </p>
          ) : null}

          <label>
            {t("Water")}
            <select name="spot" value={spotId} onChange={(event) => onSpot(event.target.value)}>
              {book.spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("Time")}
            <input
              name="caughtAt"
              type="datetime-local"
              value={caughtAt}
              onChange={(event) => {
                setCaughtAt(event.target.value);
                setTimeTouched(true);
              }}
              required
            />
          </label>

          <label>
            {t("Outing")}
            <select name="trip" value={tripId} onChange={(event) => onTrip(event.target.value)}>
              <option value="">{t("Not on a trip")}</option>
              {spotTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {formatDay(trip.date)} · {trip.title}
                </option>
              ))}
            </select>
          </label>
          {pickedTrip && caughtAt.slice(0, 10) !== pickedTrip.date ? (
            <p className="wide form-note" role="status">
              {t("This outing was on {day}; the fish is dated another day.", { day: formatDay(pickedTrip.date) })}
            </p>
          ) : null}

          <p className="wide form-note">{t("Weather is optional: note all three, or leave them blank.")}</p>
          {outingWeather && !weatherStarted ? (
            <p className="wide form-note lure-tips">
              <button
                type="button"
                className="lure-tip"
                onClick={() => {
                  setSky(outingWeather.sky);
                  setWind(outingWeather.wind);
                  setWaterTemp(fromBookTemp(outingWeather.waterTempF, units));
                }}
              >
                {t("Same as the last fish on this outing: {weather}", { weather: weatherText(outingWeather) })}
              </button>
            </p>
          ) : null}

          <label>
            {t("Sky")}
            <select name="sky" value={sky} onChange={(event) => setSky(event.target.value)} required={weatherStarted}>
              <option value="">{t("Choose")}</option>
              {SKIES.map((option) => (
                <option key={option} value={option}>
                  {t(SKY_LABELS[option])}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("Wind")}
            <select name="wind" value={wind} onChange={(event) => setWind(event.target.value)} required={weatherStarted}>
              <option value="">{t("Choose")}</option>
              {WINDS.map((option) => (
                <option key={option} value={option}>
                  {t(WIND_LABELS[option])}
                </option>
              ))}
            </select>
          </label>

          <label>
            {units === "metric" ? t("Water °C") : t("Water °F")}
            <input
              name="waterTemp"
              inputMode="decimal"
              value={waterTemp}
              onChange={(event) => setWaterTemp(event.target.value)}
              placeholder={units === "metric" ? "14" : "58"}
              aria-label={units === "metric" ? t("Water temperature in Celsius") : t("Water temperature in Fahrenheit")}
              required={weatherStarted}
            />
          </label>

          <label className="wide">
            {t("Note")}
            <textarea
              name="note"
              rows={3}
              value={note}
              maxLength={280}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("Where it hit, and what you would repeat.")}
            />
          </label>

          <div className="wide photo-field">
            <label>
              {t("Photo")}
              <input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby="photo-limit"
                onChange={onPhoto}
              />
              <small className="field-hint" id="photo-limit">
                {t(
                  "One photo, kept in this browser with the catch. Large files are reduced. Anything still over {kb} KB is turned away so it cannot crowd out the book.",
                  { kb: CATCH_PHOTO_MAX_BYTES / 1024 },
                )}
              </small>
            </label>
            {photo ? <img className="catch-photo-preview" src={photo} alt={t("Selected catch photo")} /> : null}
            {photo ? (
              <button type="button" className="text-button" onClick={clearPhoto}>
                {t("Remove photo")}
              </button>
            ) : null}
            {reducing ? <p className="field-hint">{t("Reducing the photo…")}</p> : null}
            {photoError ? (
              <p className="field-error" role="alert">
                {messageText(photoError)}
              </p>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {messageText(error)}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline" disabled={reducing}>
          {existing ? t("Save changes") : t("Save to the book")}
        </button>
      </form>
    </div>
  );
}

export function CatchPage() {
  const { book, deleteCatch, photoFor } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { catchId = "" } = useParams();
  const [pictureError, setPictureError] = useState(false);
  const entry = book.catches.find((row) => row.id === catchId);

  if (!entry) {
    return (
      <div className="sheet">
        <h1>{t("Missing fish")}</h1>
        <p className="lede">{t("That catch is not in this book.")}</p>
        <Link to="/catches">{t("Back to catches")}</Link>
      </div>
    );
  }

  const spot = spotById(book, entry.spotId);
  const trip = entry.tripId ? tripById(book, entry.tripId) : undefined;
  const photo = photoFor(entry.id);
  const { newer, older } = catchNeighbors(book, entry.id);
  const badge = catchBadge(book, entry);
  const savePicture = () => {
    const caught = new Date(entry.caughtAt);
    const text = {
      title: t(entry.species),
      detail: [measureText(entry.measure), spot?.name].filter(Boolean).join(" · "),
      conditions: entry.weather ? weatherText(entry.weather) : t(entry.lure),
      date: caught.toLocaleDateString(locale(), { year: "numeric", month: "long", day: "numeric" }),
    };
    setPictureError(false);
    saveShareCard(text, photo ?? null, shareCardFileName(entry.species, caught)).catch(() => setPictureError(true));
  };
  const heavy = entry.measure.kind === "weight";

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/catches/${entry.id}/edit`}
        ask={t("Delete this fish from the book?")}
        onDelete={() => {
          deleteCatch(entry.id);
          navigate("/catches");
        }}
      >
        <p className="eyebrow">
          <Link to="/catches">{t("Catches")}</Link>
        </p>
        <h1>{t(entry.species)}</h1>
        <p className="meta stand">
          <span>{measureText(entry.measure)}</span>
          {" · "}
          <span>{t(entry.lure)}</span>
          {spot ? (
            <>
              {" · "}
              <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
            </>
          ) : null}
          {" · "}
          <time dateTime={entry.caughtAt}>{formatClock(entry.caughtAt)}</time>
        </p>
        {badge ? (
          <p className="best-badge">
            {badge === "book"
              ? heavy
                ? t("Heaviest fish in the book")
                : t("Longest fish in the book")
              : heavy
                ? t("Your heaviest of this kind")
                : t("Your longest of this kind")}
          </p>
        ) : null}
      </EditDelete>
      {photo ? (
        <figure className="catch-photo">
          <img src={photo} alt={t("Photo of {species}", { species: t(entry.species) })} />
        </figure>
      ) : null}
      {entry.weather ? (
        <aside className="conditions" aria-label={t("Weather")}>
          <span className="eyebrow">{t("Weather")}</span>
          <p>{weatherText(entry.weather)}</p>
        </aside>
      ) : null}
      {entry.note ? <p className="prose">{noteText(entry.note)}</p> : null}
      {trip ? (
        <p className="trip-link">
          <Link to={`/trips/${trip.id}`}>{trip.title}</Link>
        </p>
      ) : null}
      <p className="another-catch">
        <Link to={anotherCatchLink(entry)} className="field-primary inline">
          {t("Log another like this")}
        </Link>
        <button type="button" className="field-primary inline" onClick={savePicture}>
          {t("Save picture")}
        </button>
      </p>
      {pictureError ? (
        <p className="field-error" role="alert">
          {t("The picture could not be made in this browser.")}
        </p>
      ) : null}
      {newer || older ? (
        <nav className="catch-steps" aria-label={t("More catches")}>
          {newer ? (
            <Link to={`/catches/${newer.id}`} rel="prev">
              {t("← Newer: {species}", { species: t(newer.species) })}
            </Link>
          ) : (
            <span />
          )}
          {older ? (
            <Link to={`/catches/${older.id}`} rel="next">
              {t("Older: {species} →", { species: t(older.species) })}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
