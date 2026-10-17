import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  likelyLength,
  likelyWeight,
  sizePairs,
  MOON_LABELS,
  MOON_QUARTER_LABELS,
  moonName,
  moonQuarterOf,
  moonPhase,
  CATCH_PHOTO_MAX_BYTES,
  FISH,
  SKIES,
  SKY_LABELS,
  WINDS,
  WIND_LABELS,
  catchesForSpot,
  catchesNewestFirst,
  localDate,
  measureOf,
  parseCatchDraft,
  personalBests,
  spotById,
  tripById,
  tripsForSpot,
  waterTempTally,
  type CatchDraft,
  type CatchEntry,
  type Measure,
} from "@stillwater/shared";
import { CatchCard } from "./cards";
import { catchNeighbors, neighborsIn } from "./catchNeighbors";
import { tempBandSearch } from "./WeatherBars";
import { LIST_PARAM, catchLink, catchList, type ListKey } from "./catchList";
import { catchBadge } from "./catchBadge";
import { photoPlace, photoTakenAt } from "./photoTime";
import { anotherCatchLink } from "./anotherCatch";
import { catchesOfSpecies, speciesLink } from "./speciesLink";
import { saveShareCard, shareCardFileName } from "../game/shareCard";
import { EditDelete } from "./EditDelete";
import { PagedCatches } from "./PagedCatches";
import { catchMonth } from "./tripMonths";
import { bookLures, dayWeather, lastMeasureKind, lastReleased, looksLikeOtherMeasure, ownFirst, speciesBestSoFar, speciesCatches, startTimeFor, tripForFish, tripLure, tripWeather } from "./suggestions";
import { sunMark, type SunMark } from "./sunLight";
import { placeFor } from "./map/places";
import { speciesLures, waterSpecies, waterTips } from "./waterTips";
import { fromBookAmount, fromBookTemp, toBookAmount, toBookTemp, unitsMessage } from "./unitsInput";
import { getUnits, locale, t, useLang, useT, type Units } from "../i18n";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { ChoiceRow } from "./ChoiceRow";
import { lengthText, measureText, measuresText, tempText, weatherText, weightText } from "../i18n/content";
import { fishCountLabel, formatCatchDay, formatClock, formatDay, formatTimeOfDay, messageText, noteText, toLocalInput } from "./format";
import { useLogbook } from "./LogbookState";
import { compressCatchPhoto } from "./photoFile";
import { catchNews } from "./catchNews";
import { likelyDuplicate } from "./likelyDuplicate";
import { dropEditDraft, dropKeptDraft, keepDraft, keepEditDraft, readEditDraft, readKeptDraft, type KeptDraft } from "./catchDraft";
import { FishSum } from "./FishSum";
import { likelyWater, nearestWater } from "./spotOrder";
import { NearestWater, canFindNearest } from "./NearestWater";
import { SpeciesChips } from "./SpeciesChips";
import { CatchSearch, FIND_PARAM, exactTerm, findLink } from "./CatchSearch";
import { savedState } from "./SavedNote";
import { CopySummary } from "./CopySummary";
import { catchSummary } from "./summaries";
import { sizeRank } from "./sizeRank";

function amountText(entry: CatchEntry, units: Units): string {
  return measureAmountText(entry.measure, units);
}

function measureAmountText(measure: Measure, units: Units): string {
  return measure.kind === "length" ? fromBookAmount(measure.inches, "length", units) : fromBookAmount(measure.pounds, "weight", units);
}

/** A best's size by the measure it is best by, or nothing when there is no such best. */
function measureOfBest(entry: CatchEntry | null, kind: "length" | "weight"): string {
  const measure = entry ? measureOf(entry, kind) : null;
  return measure ? measureText(measure) : "";
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
  "Minnow",
  "Leech",
  "Wax worm",
];

/** Live baits a shore or bait angler can pick in one tap while the lure field is still empty. */
const LIVE_BAITS = ["Nightcrawler", "Minnow", "Leech", "Wax worm"];

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
  // While a search is typed, its matches take the list's place.
  const [params] = useSearchParams();
  const searching = Boolean(params.get(FIND_PARAM)?.trim());

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
        <>
          <CatchSearch />
          {searching ? null : (
            <>
              {/* The whole book at a glance: how many, how many kinds and went back, and the largest. */}
              <FishSum catches={catches} />
              <SpeciesChips catches={catches} />
              <PagedCatches items={catches} monthOf={catchMonth} headLevel={2}>
                {(entry) => (
                  <CatchCard
                    key={entry.id}
                    entry={entry}
                    spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                    tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
                  />
                )}
              </PagedCatches>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function CatchFormPage() {
  const { catchId } = useParams();
  const [params] = useSearchParams();
  // Each arrival starts afresh, even at the same address: a second "Save and log another" lands on the same link.
  const { key } = useLocation();
  return <CatchForm key={`${catchId ?? ""}:${params.toString()}:${key}`} />;
}

/** Camera notes sit at the start of a JPEG; this much is plenty to find the time a photo was taken. */
const PHOTO_HEAD_BYTES = 256 * 1024;
/** How near a pinned water a photo must be taken to name it: a lake shore walked round, not the next town. */
const PHOTO_WATER_KM = 2;

function CatchForm() {
  const { book, storedBook, addCatch, updateCatch, photoFor } = useLogbook();
  useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { catchId } = useParams();
  const [params] = useSearchParams();
  const existing = catchId ? book.catches.find((row) => row.id === catchId) : undefined;
  const presetTrip = existing ? undefined : tripById(book, params.get("trip") ?? "");
  // A ?spot= that is no longer in the book (deleted, or an old link) falls back like no spot at all.
  const linkedSpot = book.spots.some((spot) => spot.id === params.get("spot")) ? params.get("spot") : null;
  // Opened without a water or outing ("Log a catch" anywhere): today's outing's water, else the one fished last. Worked out once.
  const [presetSpot] = useState(() => existing?.spotId ?? presetTrip?.spotId ?? linkedSpot ?? likelyWater(book, localDate(new Date())));

  const asked = params.get("kind");
  const [species, setSpecies] = useState(existing ? t(existing.species) : t(params.get("species") ?? ""));
  const bestSoFar = speciesBestSoFar(book, species, t, existing?.id);
  // Starting values that look through the whole book are worked out once, not on every keystroke.
  const [measureKind, setMeasureKind] = useState<CatchDraft["measureKind"]>(
    () => existing?.measure.kind ?? (asked === "weight" || asked === "length" ? asked : lastMeasureKind(book)),
  );
  // The form reads and writes in the units the player picked; the book keeps imperial.
  const units = getUnits();
  const [startAmount] = useState(() => (existing ? amountText(existing, units) : ""));
  const [amount, setAmount] = useState(startAmount);
  // The other measure, for a fish both measured and weighed.
  const [startAlso] = useState(() => (existing?.alsoMeasure ? measureAmountText(existing.alsoMeasure, units) : ""));
  const [alsoAmount, setAlsoAmount] = useState(startAlso);
  const otherKind = measureKind === "length" ? "weight" : "length";
  // From this kind's fish that were both measured and weighed: about what the other measure of this one would be.
  const typedAmount = Number(toBookAmount(amount, measureKind, units));
  const pairs = sizePairs(speciesCatches(book, species, t, existing?.id));
  // A number far past this kind's best that fits the other measure: likely typed in the wrong one, as the form keeps the last.
  // Only with the other measure left empty: with both typed, switching swaps them, which would keep the odd number.
  const otherMeasure = !alsoAmount.trim() && looksLikeOtherMeasure(bestSoFar, measureKind, typedAmount, Number(toBookAmount(amount, otherKind, units)));
  const amountInput = useRef<HTMLInputElement>(null);
  const likely = !(typedAmount > 0) ? null : measureKind === "length" ? likelyWeight(pairs, typedAmount) : likelyLength(pairs, typedAmount);
  const pickMeasureKind = (kind: CatchDraft["measureKind"]) => {
    // Both typed: switching which is the main measure swaps them, so each number stays with its kind.
    if (kind !== measureKind && alsoAmount.trim()) {
      setAmount(alsoAmount);
      setAlsoAmount(amount);
    }
    setMeasureKind(kind);
  };
  const [lure, setLure] = useState(() => t(existing ? existing.lure : (params.get("lure") ?? tripLure(book, presetTrip?.id))));
  const [spotId, setSpotId] = useState(presetSpot);
  // A new fish on a water with an outing planned today (or last night, in the small hours) files under that outing.
  const [tripId, setTripId] = useState(() =>
    existing ? (existing.tripId ?? "") : (presetTrip?.id ?? tripForFish(book, presetSpot, toLocalInput(new Date()))?.id ?? ""),
  );
  // Until the player picks an outing themselves, the outing follows the water and the day.
  const [tripPicked, setTripPicked] = useState(Boolean(existing || presetTrip));
  // The outing a change of water took the fish off, until the outing is picked again.
  const [leftTrip, setLeftTrip] = useState("");
  // Set while a change of water is what took the fish off its own outing, so going back to that water can put it back.
  const [waterTookTrip, setWaterTookTrip] = useState(false);
  const [caughtAt, setCaughtAt] = useState(() =>
    existing ? toLocalInput(new Date(existing.caughtAt)) : toLocalInput(startTimeFor(presetTrip)),
  );
  // Until the player sets the time themselves, picking an outing moves the catch to its day.
  const [timeTouched, setTimeTouched] = useState(Boolean(existing));
  // The time read from a photo's camera notes, while the time field still holds it.
  const [photoTime, setPhotoTime] = useState("");
  // The water a photo's location picked, while the water field still holds it.
  const [photoSpot, setPhotoSpot] = useState("");
  // Set once the player picks a water themselves; a photo's location doesn't overrule them.
  // A water brought in by a link (Log a fish on a water's page) counts as picked: a photo's place won't move it.
  const spotTouched = useRef(Boolean(linkedSpot));
  // Read when the photo's notes come in, so a time typed while they were read is kept.
  const timeTouchedNow = useRef(timeTouched);
  timeTouchedNow.current = timeTouched;
  const [note, setNote] = useState(existing?.note ?? "");
  const [released, setReleased] = useState(() => (existing ? existing.released === true : lastReleased(book)));
  const [sky, setSky] = useState(existing?.weather?.sky ?? "");
  const [wind, setWind] = useState(existing?.weather?.wind ?? "");
  const [startTemp] = useState(() => (existing?.weather?.waterTempF === undefined ? "" : fromBookTemp(existing.weather.waterTempF, units)));
  const [waterTemp, setWaterTemp] = useState(startTemp);
  // Conditions are optional, but once one is noted the other two are needed.
  const weatherStarted = Boolean(sky || wind || waterTemp.trim());
  const [photo, setPhoto] = useState<string | null>(existing ? photoFor(existing.id) : null);
  const [photoError, setPhotoError] = useState("");
  const [reducing, setReducing] = useState(false);
  const [error, setError] = useState("");
  const photoPick = useRef(0);
  // A fish's fields as the edit form holds them, to tell kept changes from the fish as it reads now.
  const editFields = () => JSON.stringify({ species, measureKind, amount, alsoAmount, lure, spotId, tripId, caughtAt, note, sky, wind, waterTemp, released });
  // The fish as the edit form opened on it.
  const [editBase] = useState(() => (existing ? editFields() : ""));
  // The fish as stored, which kept changes are tied to: unlike the form, it reads the same in any language or units.
  // The stored record, not the one on screen, which a sample book shows translated.
  // Set once the edit is saved or cancelled: the re-render a save causes must not keep the saved values as changes.
  const editDone = useRef(false);
  const recordBase = existing ? JSON.stringify(storedBook.catches.find((entry) => entry.id === existing.id) ?? existing) : "";
  // A new fish typed but never saved, or changes to this one, waits here until it is picked up or let go.
  const [waiting, setWaiting] = useState<KeptDraft | null>(() => (existing ? readEditDraft(existing.id, recordBase) : readKeptDraft()));

  // A new fish the same kind and size as one logged at this water minutes apart: likely the same fish twice.
  const twin =
    existing || !amount.trim()
      ? null
      : likelyDuplicate(book, { species, spotId, caughtAt }, t, (entry) => {
          const size = measureOf(entry, measureKind);
          return size !== null && measureAmountText(size, units) === amount.trim();
        });

  // What the form opened with (presets from a trip or Log another), so untouched presets aren't kept.
  const opened = useRef<string | null>(null);

  useEffect(() => {
    // While an older draft waits, keep it rather than overwrite it with this one.
    if (waiting || editDone.current) return;
    if (existing) {
      // Changes to a fish in the book: kept until saved or cancelled, let go when the form reads as the fish again.
      const now = editFields();
      if (now === editBase) dropEditDraft(existing.id);
      else
        keepEditDraft({
          ...(JSON.parse(now) as Omit<KeptDraft, "timeTouched" | "units" | "savedAt">),
          timeTouched,
          units,
          savedAt: new Date().toISOString(),
          catchId: existing.id,
          base: recordBase,
        });
      return;
    }
    const fields = { species, measureKind, amount, alsoAmount, lure, spotId, tripId, note, sky, wind, waterTemp, released };
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
      alsoAmount,
      lure,
      spotId,
      tripId,
      caughtAt,
      note,
      sky,
      wind,
      waterTemp,
      released,
      timeTouched,
      units,
      savedAt: new Date().toISOString(),
    });
  }, [existing, waiting, species, measureKind, amount, alsoAmount, lure, spotId, tripId, caughtAt, note, sky, wind, waterTemp, released, timeTouched, units]);

  const pickUp = (kept: KeptDraft) => {
    const keptSpot = book.spots.some((spot) => spot.id === kept.spotId) ? kept.spotId : spotId;
    const keptTrip = tripsForSpot(book, keptSpot).some((trip) => trip.id === kept.tripId) ? kept.tripId : "";
    setSpecies(kept.species);
    setMeasureKind(kept.measureKind);
    setLure(kept.lure);
    setSpotId(keptSpot);
    setTripId(keptTrip);
    setTripPicked(true);
    setCaughtAt(kept.caughtAt);
    setTimeTouched(kept.timeTouched);
    setNote(kept.note);
    setReleased(kept.released === true);
    setSky(kept.sky);
    setWind(kept.wind);
    // Numbers typed in other units would mean something else now.
    if (kept.units === units) {
      setAmount(kept.amount);
      setAlsoAmount(kept.alsoAmount ?? "");
      setWaterTemp(kept.waterTemp);
    }
    // Picked up counts as typed: it stays kept even before the next keystroke.
    opened.current = "";
    setWaiting(null);
  };

  // A long book makes these slow enough to drag typing, so they wait for the book, water or language to change.
  const spotTrips = useMemo(() => tripsForSpot(book, spotId), [book, spotId]);
  const hereCatches = useMemo(() => catchesForSpot(book, spotId), [book, spotId]);
  const hereLures = useMemo(() => (waterTips(hereCatches)?.lures ?? []).map((row) => t(row.lure)), [hereCatches, lang]);
  // One-tap picks: the kinds this water gives, and once a kind is typed, the lures that took it here.
  const hereSpecies = useMemo(() => waterSpecies(hereCatches).map((name) => t(name)), [hereCatches, lang]);
  const kindLures = useMemo(
    () => speciesLures(hereCatches.map((entry) => ({ ...entry, species: t(entry.species) })), species).map((name) => t(name)),
    [hereCatches, species, lang],
  );
  const lurePicks = kindLures.length > 0 ? kindLures : hereLures;
  const speciesOptions = useMemo(
    () =>
      ownFirst(
        book.catches.map((entry) => entry.species),
        SPECIES,
        t,
      ).sort((a, b) => a.localeCompare(b)),
    [book, lang],
  );
  const lureOptions = useMemo(() => ownFirst(bookLures(book), BAITS, t), [book, lang]);
  // Made once per water: a water fished for years lists hundreds of outings.
  const tripOptions = useMemo(
    () =>
      spotTrips.map((trip) => (
        <option key={trip.id} value={trip.id}>
          {formatDay(trip.date)} · {trip.title}
        </option>
      )),
    [spotTrips, lang],
  );
  const heading = existing ? t(existing.species) : presetTrip ? presetTrip.title : t("Log a catch");

  const onSpot = (nextSpot: string) => {
    spotTouched.current = true;
    setSpotId(nextSpot);
    if (tripId && tripsForSpot(book, nextSpot).some((trip) => trip.id === tripId)) return;
    // Back on the fish's own water: the outing it was on comes back with it.
    if (existing?.tripId && nextSpot === existing.spotId && waterTookTrip && tripById(book, existing.tripId)) {
      setLeftTrip("");
      setWaterTookTrip(false);
      setTripId(existing.tripId);
      setTripPicked(true);
      return;
    }
    const nextTrip = existing ? "" : (tripForFish(book, nextSpot, caughtAt)?.id ?? "");
    // Said under the water, so an outing doesn't quietly go from the fish; kept while no outing takes its place.
    setLeftTrip(tripId ? (nextTrip !== tripId ? (tripById(book, tripId)?.title ?? "") : "") : nextTrip ? "" : leftTrip);
    if (existing && tripId === existing.tripId) setWaterTookTrip(true);
    setTripId(nextTrip);
    setTripPicked(Boolean(existing));
  };

  const canLocate = !existing && canFindNearest(book);

  const pickedTrip = tripId ? tripById(book, tripId) : undefined;
  const outingWeather = useMemo(() => tripWeather(book, tripId, existing?.id), [book, tripId, existing?.id]);
  // No outing weather to go by: the newest fish logged the same day may still say what the sky was doing.
  const sameDayWeather = useMemo(
    () => (outingWeather ? null : dayWeather(book, caughtAt.slice(0, 10), existing?.id, spotId)),
    [book, outingWeather, caughtAt, existing?.id, spotId],
  );
  const offeredWeather = outingWeather ?? sameDayWeather;

  const onTrip = (nextTrip: string) => {
    setTripId(nextTrip);
    setLeftTrip("");
    setWaterTookTrip(false);
    setTripPicked(true);
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
    // A new fish takes the time the photo was taken, if the camera noted one and the time hasn't been set, and the
    // pinned water within a couple of km of where it was taken, if the water and outing haven't been picked.
    const canMoveWater = !tripPicked && !spotTouched.current;
    if (!existing && (!timeTouched || canMoveWater)) {
      void file
        .slice(0, PHOTO_HEAD_BYTES)
        .arrayBuffer()
        .then((head) => {
          if (photoPick.current !== ticket) return;
          const bytes = new Uint8Array(head);
          const place = canMoveWater ? photoPlace(bytes) : null;
          const near = place ? nearestWater(book, place) : null;
          const water = near && near.km <= PHOTO_WATER_KM && !spotTouched.current ? near.spot.id : spotId;
          if (water !== spotId) {
            setSpotId(water);
            setPhotoSpot(water);
          }
          const taken = photoTakenAt(bytes);
          const timed = !timeTouchedNow.current && taken && taken <= toLocalInput(new Date()) ? taken : null;
          if (timed) {
            setCaughtAt(timed);
            setPhotoTime(timed);
            // Read off the camera, so picking an outing afterwards keeps it.
            setTimeTouched(true);
          }
          if (!tripPicked && (timed || water !== spotId)) setTripId(tripForFish(book, water, timed ?? caughtAt)?.id ?? "");
        })
        .catch(() => {
          // No camera notes to read: the time stays as it was.
        });
    }
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

  // An untouched number keeps its stored value, so a metric round trip doesn't nudge it; that holds for a length and
  // weight swapped between the two fields too.
  const bookAmount = (text: string, kind: CatchDraft["measureKind"]) => {
    const stored = existing ? measureOf(existing, kind) : null;
    return stored && text === measureAmountText(stored, units) ? measureAmountText(stored, "imperial") : toBookAmount(text, kind, units);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (reducing) {
      setError(t("Wait for the photo to finish reducing."));
      return;
    }
    const draft: CatchDraft = {
      // A name already in the book is kept as written there, so "rock bass" joins "Rock bass".
      species: bookName(species, [...(existing ? [existing.species] : []), ...SPECIES, ...book.catches.map((entry) => entry.species)]),
      measureKind,
      amount: bookAmount(amount, measureKind),
      alsoAmount: bookAmount(alsoAmount, otherKind),
      lure: bookName(lure, [...(existing ? [existing.lure] : []), ...bookLures(book), ...BAITS]),
      spotId,
      tripId,
      caughtAt,
      note,
      sky,
      wind,
      waterTemp:
        existing?.weather?.waterTempF !== undefined && waterTemp === startTemp ? String(existing.weather.waterTempF) : toBookTemp(waterTemp, units),
      released,
    };
    // Worked out against the book before this fish joins it.
    const parsed = existing ? null : parseCatchDraft(draft, book);
    const news = parsed?.ok ? catchNews(book, parsed.value) : null;
    const result = existing ? updateCatch(existing.id, draft, photo) : addCatch(draft, photo);
    if (!result.ok) {
      setError(unitsMessage(result.message, units));
      markInvalid(event.currentTarget as HTMLFormElement, result.field);
      return;
    }
    if (existing) {
      editDone.current = true;
      dropEditDraft(existing.id);
      // Back to the fish, still within the list it was opened from.
      navigate(catchLink(existing.id, (params.get(LIST_PARAM) ?? undefined) as ListKey | undefined), savedState("catchEdit"));
      return;
    }
    // The waiting draft, if any, stays for later; this one is saved.
    if (!waiting) dropKeptDraft();
    // "Save and log another": a fresh form on the same water, outing, fish, lure and measure, the time now.
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("name") === "another") {
      navigate(anotherCatchLink({ spotId, tripId: tripId || null, species: draft.species, lure: draft.lure, measure: { kind: measureKind } }), savedState("catch", news));
      return;
    }
    navigate(tripId ? `/trips/${tripId}` : "/catches", savedState("catch", news));
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
        <Link to="/spots/new?then=catch" className="field-primary inline">
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
          <h1 data-title={existing ? t("Editing {name}", { name: t(existing.species) }) : t("Log a catch")}>{heading}</h1>
        </div>
        <Link
          to={existing ? catchLink(existing.id, (params.get(LIST_PARAM) ?? undefined) as ListKey | undefined) : tripId ? `/trips/${tripId}` : "/catches"}
          // Cancelling an edit means it: the changes are not kept for later.
          onClick={
            existing
              ? () => {
                  editDone.current = true;
                  dropEditDraft(existing.id);
                }
              : undefined
          }
        >
          {t("Cancel")}
        </Link>
      </header>
      {waiting ? (
        <div className="kept-draft" role="status">
          <p>
            {existing
              ? t("Changes you made to this fish were not saved.")
              : waiting.species.trim()
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
              if (existing) dropEditDraft(existing.id);
              else dropKeptDraft();
              setWaiting(null);
            }}
          >
            {t("Let it go")}
          </button>
        </div>
      ) : null}
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
              {speciesOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {bestSoFar ? (
              <small className="field-hint">
                {t("Your biggest so far: {measures}", {
                  measures: [measureOfBest(bestSoFar.longest, "length"), measureOfBest(bestSoFar.heaviest, "weight")].filter(Boolean).join(" · "),
                })}
              </small>
            ) : null}
          </label>
          {hereSpecies.length > 0 ? (
            <p className="wide form-note lure-tips">
              {t("Comes from this water:")}{" "}
              {hereSpecies.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="lure-tip"
                  aria-pressed={species.trim().toLowerCase() === name.toLowerCase()}
                  onClick={() => setSpecies(name)}
                >
                  {name}
                </button>
              ))}
            </p>
          ) : null}

          <fieldset className="wide">
            <legend>{t("Measure")}</legend>
            <ChoiceRow
              label={t("Length or weight")}
              value={measureKind}
              options={[
                { id: "length", label: t("Length") },
                { id: "weight", label: t("Weight") },
              ]}
              onChange={pickMeasureKind}
            />
            <input
              name="amount"
              ref={amountInput}
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
            {/* Optional: a fish both measured and weighed keeps both, and counts for both bests. */}
            <label className="also-measure">
              {measureKind === "length" ? t("Also weighed (optional)") : t("Also measured (optional)")}
              <input
                name="alsoAmount"
                inputMode="decimal"
                aria-label={`${measureKind === "length" ? t("Also weighed (optional)") : t("Also measured (optional)")}, ${
                  units === "metric" ? (otherKind === "length" ? t("Centimetres") : t("Kilograms")) : otherKind === "length" ? t("Inches") : t("Pounds")
                }`}
                value={alsoAmount}
                onChange={(event) => setAlsoAmount(event.target.value)}
                placeholder={
                  units === "metric" ? (otherKind === "length" ? t("Centimetres") : t("Kilograms")) : otherKind === "length" ? t("Inches") : t("Pounds")
                }
              />
            </label>
            {/* Kept in place so a screen reader hears the hint when it comes. */}
            <p className="field-hint wrong-measure" role="status">
              {otherMeasure ? (
                <>
                {measureKind === "weight"
                  ? t("Far past your heaviest of this kind ({size}). Was it a length?", { size: measureOfBest(bestSoFar!.heaviest, "weight") })
                  : t("Far past your longest of this kind ({size}). Was it a weight?", { size: measureOfBest(bestSoFar!.longest, "length") })}{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    pickMeasureKind(otherKind);
                    // The button goes with the hint: the number it moved is where to carry on.
                    amountInput.current?.focus();
                  }}
                >
                  {otherKind === "length" ? t("Make it a length") : t("Make it a weight")}
                </button>
                </>
              ) : null}
            </p>
            {likely !== null && !alsoAmount.trim() ? (
              <small className="field-hint">
                {t("Your other fish of this kind suggest about {size}.", { size: otherKind === "weight" ? weightText(likely) : lengthText(likely) })}
              </small>
            ) : null}
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
              {lureOptions.map((bait) => (
                <option key={bait} value={bait} />
              ))}
            </datalist>
          </label>
          {lurePicks.length > 0 ? (
            <p className="wide form-note lure-tips">
              {kindLures.length > 0 ? t("Took this kind here:") : t("Works on this water:")}{" "}
              {lurePicks.map((name) => (
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
          {!lure.trim() ? (
            <p className="wide form-note lure-tips live-baits">
              {t("Live bait:")}{" "}
              {LIVE_BAITS.map((name) => (
                <button key={name} type="button" className="lure-tip" onClick={() => setLure(t(name))}>
                  {t(name)}
                </button>
              ))}
            </p>
          ) : null}

          <div className="water-field">
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
            {photoSpot && photoSpot === spotId ? <span className="field-hint">{t("Water from the photo's location.")}</span> : null}
            {leftTrip ? <span className="field-hint">{t("No longer on {outing}: that outing was on another water.", { outing: leftTrip })}</span> : null}
            {canLocate ? <NearestWater book={book} onPick={onSpot} /> : null}
          </div>

          <label>
            {t("Time")}
            <input
              name="caughtAt"
              type="datetime-local"
              value={caughtAt}
              max={toLocalInput(new Date())}
              onChange={(event) => {
                setCaughtAt(event.target.value);
                if (!tripPicked) setTripId(tripForFish(book, spotId, event.target.value)?.id ?? "");
                setTimeTouched(true);
              }}
              required
            />
            {photoTime && photoTime === caughtAt ? <span className="field-hint">{t("Taken from the photo.")}</span> : null}
          </label>

          <label>
            {t("Outing")}
            <select name="trip" value={tripId} onChange={(event) => onTrip(event.target.value)}>
              <option value="">{t("Not on a trip")}</option>
              {tripOptions}
            </select>
          </label>
          {pickedTrip && caughtAt.slice(0, 10) !== pickedTrip.date ? (
            <p className="wide form-note" role="status">
              {t("This outing was on {day}; the fish is dated another day.", { day: formatDay(pickedTrip.date) })}
            </p>
          ) : null}

          <p className="wide form-note">{t("Weather is optional: note the sky and wind, and the water temperature if you took it.")}</p>
          {offeredWeather && !weatherStarted ? (
            <p className="wide form-note lure-tips">
              <button
                type="button"
                className="lure-tip"
                onClick={() => {
                  setSky(offeredWeather.sky);
                  setWind(offeredWeather.wind);
                  setWaterTemp(offeredWeather.waterTempF === undefined ? "" : fromBookTemp(offeredWeather.waterTempF, units));
                }}
              >
                {outingWeather
                  ? t("Same as the last fish on this outing: {weather}", { weather: weatherText(outingWeather) })
                  : t("Same as the last fish that day: {weather}", { weather: weatherText(offeredWeather) })}
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
            />
          </label>

          <label className="wide check-field">
            <input name="released" type="checkbox" checked={released} onChange={(event) => setReleased(event.target.checked)} />
            {t("Released it")}
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
          <p className="field-error" role="alert" id={FORM_ERROR_ID}>
            {messageText(error)}
          </p>
        ) : null}
        {/* The same kind at the same water a few minutes apart is more likely one fish logged twice than two. */}
        {twin ? (
          <p className="form-note" role="status">
            {t("A {species} was already logged here at {time}. Saving adds another.", { species: t(twin.species), time: formatTimeOfDay(twin.caughtAt) })}{" "}
            <Link to={`/catches/${twin.id}`}>{t("Open it")}</Link>
          </p>
        ) : null}
        {/* Stays on screen while a long form scrolls, so the save is always a thumb away. */}
        <div className="form-save">
          <button type="submit" className="field-primary inline" disabled={reducing}>
            {existing ? t("Save changes") : t("Save to the book")}
          </button>
          {existing ? null : (
            <button type="submit" name="another" className="text-button" disabled={reducing}>
              {t("Save and log another")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/** "40 min after sunrise", "1 h 5 min before sunset", "At sunrise", or "In daylight" / "After dark" away from both. */
function sunMarkText(mark: SunMark): string {
  if (!mark.edge) return mark.light === "day" ? t("In daylight") : t("After dark");
  const away = Math.abs(mark.minutes);
  if (away < 3) return mark.edge === "rise" ? t("At sunrise") : t("At sunset");
  const hours = Math.floor(away / 60);
  const minutes = away % 60;
  const time = hours === 0 ? t("{n} min", { n: minutes }) : minutes === 0 ? t("{h} h", { h: hours }) : t("{h} h {n} min", { h: hours, n: minutes });
  if (mark.edge === "rise") return mark.minutes < 0 ? t("{time} before sunrise", { time }) : t("{time} after sunrise", { time });
  return mark.minutes < 0 ? t("{time} before sunset", { time }) : t("{time} after sunset", { time });
}

/** Keyed by the fish, so stepping to the next one starts fresh: no open delete question or photo error carried over. */
export function CatchPage() {
  const { catchId = "" } = useParams();
  return <CatchView key={catchId} />;
}

function CatchView() {
  const { book, deleteCatch, fileCatches, photoFor } = useLogbook();
  useT();
  const navigate = useNavigate();
  const { catchId = "" } = useParams();
  const [params] = useSearchParams();
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
  const tripFish = trip ? book.catches.filter((other) => other.tripId === trip.id).length : 0;
  // A fish logged on its own while an outing was on this water that day: offer to file it there.
  const looseTrip = trip ? undefined : tripForFish(book, entry.spotId, toLocalInput(new Date(entry.caughtAt)));
  const photo = photoFor(entry.id);
  // Opened from a list (a search, a kind, an outing, a water): the steps keep to it, and lead back to it.
  const list = catchList(book, params.get(LIST_PARAM), entry.id, t, (id) => photoFor(id) !== null);
  const { newer, older } = list ? neighborsIn(list.rows, entry.id) : catchNeighbors(book, entry.id);
  const listAt = list ? list.rows.findIndex((row) => row.id === entry.id) + 1 : 0;
  const badge = catchBadge(book, entry);
  // Newest first, so the oldest fish of the kind is number one.
  const kind = catchesOfSpecies(book, entry.species);
  const kindNumber = kind.length - kind.findIndex((other) => other.id === entry.id);
  // Short of a best, where it sits among the others of its kind.
  const rank = sizeRank(kind, entry);
  const caughtDay = localDate(new Date(entry.caughtAt));
  // Where the fish's time sat against the sun at its water, for a water with a place.
  const place = spot ? (spot.place ?? placeFor(spot.id)) : undefined;
  const sun = place ? sunMark(entry.caughtAt, place) : null;
  const sameDay = book.catches.filter((other) => localDate(new Date(other.caughtAt)) === caughtDay).length;
  const savePicture = () => {
    const caught = new Date(entry.caughtAt);
    const text = {
      title: t(entry.species),
      detail: [measuresText(entry), spot?.name].filter(Boolean).join(" · "),
      conditions: entry.weather ? weatherText(entry.weather) : t(entry.lure),
      date: caught.toLocaleDateString(locale(), { year: "numeric", month: "long", day: "numeric" }),
    };
    setPictureError(false);
    saveShareCard(text, photo ?? null, shareCardFileName(entry.species, caught)).catch(() => setPictureError(true));
  };
  // Which best the badge is for: a fish both measured and weighed may hold either.
  const bests = badge ? personalBests(book) : null;
  const kindBests = bests?.species.find((row) => row.species.trim().toLowerCase() === entry.species.trim().toLowerCase());
  const heavy = (badge === "book" ? bests?.heaviest : kindBests?.heaviest)?.id === entry.id;

  return (
    <div className="sheet">
      <EditDelete
        editTo={list ? `/catches/${entry.id}/edit?${LIST_PARAM}=${encodeURIComponent(list.key)}` : `/catches/${entry.id}/edit`}
        ask={t("Delete this fish from the book?")}
        onDelete={() => {
          if (deleteCatch(entry.id)) navigate(list?.back ?? "/catches");
        }}
      >
        <p className="eyebrow">
          <Link to="/catches">{t("Catches")}</Link>
          {" · "}
          <Link to={speciesLink(entry.species)}>
            {kind.length > 1
              ? t("{species}: {n} of {total}", { species: t(entry.species), n: kindNumber, total: kind.length })
              : t("All {species}", { species: t(entry.species) })}
          </Link>
        </p>
        {/* The tab says which fish of the kind this is: its size and day. */}
        <h1 data-title={`${t(entry.species)}, ${measuresText(entry)} · ${formatCatchDay(entry.caughtAt)}`}>{t(entry.species)}</h1>
        <p className="meta stand">
          <span>{measuresText(entry)}</span>
          {" · "}
          {/* Every fish taken on this lure, through the catch search. */}
          <Link to={findLink(exactTerm("lure", t(entry.lure)))}>{t(entry.lure)}</Link>
          {spot ? (
            <>
              {" · "}
              <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
            </>
          ) : null}
          {" · "}
          {/* With other fish that day, the day opens all of them in the catch search. */}
          {sameDay > 1 ? (
            <Link to={findLink(caughtDay)} aria-label={t("{when}, every fish that day ({count})", { when: formatClock(entry.caughtAt), count: sameDay })}>
              <time dateTime={entry.caughtAt}>{formatClock(entry.caughtAt)}</time>
            </Link>
          ) : (
            <time dateTime={entry.caughtAt}>{formatClock(entry.caughtAt)}</time>
          )}
          {entry.released ? (
            <>
              {" · "}
              <Link to={findLink(t("Released"))}>{t("Released")}</Link>
            </>
          ) : null}
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
        ) : rank ? (
          <p className="meta">{rank}</p>
        ) : null}
      </EditDelete>
      {photo ? (
        <figure className="catch-photo">
          <img src={photo} alt={t("Photo of {species}", { species: t(entry.species) })} />
        </figure>
      ) : null}
      <aside className="conditions" aria-label={t("Conditions")}>
        {entry.weather ? (
          <>
            <span className="eyebrow">{t("Weather")}</span>
            <p>
              {/* The sky and the wind open every fish caught under them, and the temperature its 10° band, through the catch search. */}
              <Link to={findLink(exactTerm("sky", t(SKY_LABELS[entry.weather.sky])))}>{t(SKY_LABELS[entry.weather.sky])}</Link>
              {" · "}
              <Link to={findLink(exactTerm("wind", t(WIND_LABELS[entry.weather.wind])))}>{t(WIND_LABELS[entry.weather.wind])}</Link>
              {entry.weather.waterTempF === undefined ? null : (
                <>
                  {" · "}
                  <Link to={findLink(tempBandSearch(waterTempTally({ spots: [], trips: [], catches: [entry] }).find((row) => row.count > 0)!))}>
                    {tempText(entry.weather.waterTempF)}
                  </Link>
                </>
              )}
            </p>
          </>
        ) : null}
        {sun ? (
          <>
            <span className="eyebrow">{t("Sun")}</span>
            <p>{sunMarkText(sun)}</p>
          </>
        ) : null}
        <span className="eyebrow">{t("Moon")}</span>
        <p>
          {/* The phase opens every fish from the same week of the moon. */}
          <Link to={findLink(exactTerm("moon", t(MOON_QUARTER_LABELS[moonQuarterOf(new Date(entry.caughtAt))])))}>
            {t(MOON_LABELS[moonName(moonPhase(new Date(entry.caughtAt)))])}
          </Link>
        </p>
      </aside>
      {entry.note ? <p className="prose">{noteText(entry.note)}</p> : null}
      <CopySummary text={() => catchSummary(entry, spot?.name ?? null)} file="stillwater-catch.txt" photo={photo} />
      {trip ? (
        <p className="trip-link">
          {t("Outing:")} <Link id="catch-outing" to={`/trips/${trip.id}`}>{trip.title}</Link>
          {tripFish > 1 ? ` · ${fishCountLabel(tripFish)}` : null}
        </p>
      ) : looseTrip ? (
        <p className="trip-link">
          {t("An outing on this water that day:")} <Link to={`/trips/${looseTrip.id}`}>{looseTrip.title}</Link>{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              // The button goes once the fish is filed; the outing's link takes its place, and focus.
              if (fileCatches([entry.id], looseTrip.id)) setTimeout(() => document.getElementById("catch-outing")?.focus(), 0);
            }}
          >
            {t("Add this fish to it")}
          </button>
        </p>
      ) : (
        // No outing that day on this water: one can be made around the fish, so its day gets the outing's counts and pace.
        <p className="trip-link">
          <Link to={`/trips/new?${new URLSearchParams({ spot: entry.spotId, date: localDate(new Date(entry.caughtAt)), loose: "1" }).toString()}`}>
            {t("Make an outing of this day")}
          </Link>
        </p>
      )}
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
            <Link to={catchLink(newer.id, list?.key)} rel="prev">
              {t("← Newer: {species}", { species: t(newer.species) })}
            </Link>
          ) : (
            <span />
          )}
          {older ? (
            <Link to={catchLink(older.id, list?.key)} rel="next">
              {t("Older: {species} →", { species: t(older.species) })}
            </Link>
          ) : null}
        </nav>
      ) : null}
      {list ? (
        <p className="catch-list-at">
          <Link to={list.back}>{t("Back to this list, {at} of {count}", { at: listAt, count: list.rows.length })}</Link>
        </p>
      ) : null}
    </div>
  );
}
