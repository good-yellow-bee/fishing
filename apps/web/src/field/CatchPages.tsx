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
  type Logbook,
  type Measure,
} from "@stillwater/shared";
import { CatchCard } from "./cards";
import { sameSizeSearch } from "./sizeQuery";
import { PhotoFull } from "./PhotoFull";
import { catchNeighbors, neighborsIn } from "./catchNeighbors";
import { tempBandSearch } from "./WeatherBars";
import { LIST_PARAM, catchLink, catchList, type ListKey } from "./catchList";
import { catchBadge } from "./catchBadge";
import { photoPlace, photoTakenAt } from "./photoTime";
import { AT_PARAM, RESUME_PARAM, anotherCatchLink } from "./anotherCatch";
import { catchesOfSpecies, kindOnPage, speciesLink } from "./speciesLink";
import { saveShareCard, shareCardFileName } from "../game/shareCard";
import { EditDelete } from "./EditDelete";
import { PagedCatches } from "./PagedCatches";
import { bookFishDay, catchMonth } from "./tripMonths";
import { byTime, countedFish, milestoneOf, ownFish } from "./milestones";
import { bookLures, closeSpecies, dayWeather, fullSpecies, LATE_NIGHT_UNTIL, dayAfter, fishOnOutingDay, farPastBest, kindMeasure, lastMeasureKind, lastReleased, looksLikeOtherMeasure, ownFirst, speciesBestSoFar, speciesCatches, startTimeFor, tripForFish, tripLure, tripWeather } from "./suggestions";
import { sunMark, type SunMark } from "./sunLight";
import { placeFor } from "./map/places";
import { TripCounts } from "./tripCounts";
import { speciesLures, waterSpecies, waterTips } from "./waterTips";
import { fromBookAmount, fromBookTemp, gramsAsKilos, toBookAmount, toBookTemp, unitsMessage } from "./unitsInput";
import { getUnits, locale, t, useLang, useT, type Units } from "../i18n";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { ChoiceRow } from "./ChoiceRow";
import { lengthText, measureText, measuresText, tempText, weatherText, weightText } from "../i18n/content";
import { fishCountLabel, formatCatchDay, formatClock, formatDay, formatTimeOfDay, messageText, noteText, outingName, outingNameById, toLocalInput } from "./format";
import { useLogbook } from "./LogbookState";
import { compressCatchPhoto } from "./photoFile";
import { catchNews } from "./catchNews";
import { likelyDuplicate } from "./likelyDuplicate";
import { isSampleCatch, isSampleSpot } from "./bookCopy";
import { dropEditDraft, dropKeptDraft, keepDraft, keepEditDraft, readEditDraft, readKeptDraft, type KeptDraft } from "./catchDraft";
import { FishSum } from "./FishSum";
import { likelyWater, nearestWater } from "./spotOrder";
import { NearestWater, canFindNearest } from "./NearestWater";
import { SpeciesChips } from "./SpeciesChips";
import { CatchSearch, FIND_PARAM, exactTerm, findCatches, findLink } from "./CatchSearch";
import { findWithLink } from "./findLinks";
import { savedState } from "./SavedNote";
import { CopySummary } from "./CopySummary";
import { catchSummary } from "./summaries";
import { biggestOnOuting, biggestSince, forItsLength, longGap, sizeRank } from "./sizeRank";
import { PLAY_LAKE_ID, offPlayLake, withoutPlayLake } from "./playLake";
import { countedSearch } from "./countedSearch";
import { useStepKeys } from "./stepKeys";

/** When the outing's newest fish came, so a session still going past the small hours keeps the clock's day. */
function lastFishOn(book: Logbook, tripId: string | undefined): string | undefined {
  if (!tripId) return undefined;
  return book.catches.reduce<string | undefined>((last, entry) => (entry.tripId === tripId && (!last || entry.caughtAt > last) ? entry.caughtAt : last), undefined);
}

/** The day an outing made around a loose fish goes on: the evening before for a small-hours fish that has loose fish there that evening, so a night session stays one outing. */
function looseOutingDay(book: Logbook, entry: CatchEntry): string {
  const caught = new Date(entry.caughtAt);
  const eve = localDate(new Date(caught.getFullYear(), caught.getMonth(), caught.getDate() - 1, 12));
  const night =
    caught.getHours() < LATE_NIGHT_UNTIL &&
    book.catches.some((other) => other.id !== entry.id && other.spotId === entry.spotId && !other.tripId && localDate(new Date(other.caughtAt)) === eve);
  return night ? eve : localDate(caught);
}

/** Whether a fish caught now still belongs to this outing: its day, or the small hours after it. */
function outingGoesOn(book: Logbook, tripId: string | null): boolean {
  const trip = tripId ? tripById(book, tripId) : undefined;
  return trip !== undefined && fishOnOutingDay(book, trip.spotId, toLocalInput(new Date()), trip.date, true);
}

function amountText(entry: CatchEntry, units: Units): string {
  return measureAmountText(entry.measure, units);
}

/** A number for a form box, with the decimal sign the reader writes: "0,64" in Polish. */
function inputNumber(text: string): string {
  return locale().startsWith("pl") ? text.replace(".", ",") : text;
}

/** "850" typed as kilograms on a phone's number pad is grams: one tap turns it into "0,85". */
function GramsHint({ units, kind, text, onUse, box }: { units: Units; kind: "length" | "weight"; text: string; onUse: (text: string) => void; box: string }) {
  const kilos = units === "metric" && kind === "weight" ? gramsAsKilos(text) : null;
  if (!kilos) return null;
  const shown = inputNumber(kilos);
  return (
    <small className="field-hint">
      {t("Grams?")}{" "}
      <button
        type="button"
        className="text-button"
        onClick={() => {
          onUse(shown);
          setTimeout(() => document.querySelector<HTMLElement>(box)?.focus(), 0);
        }}
      >
        {t("Make it {kg} kg", { kg: shown })}
      </button>
    </small>
  );
}

function measureAmountText(measure: Measure, units: Units): string {
  return inputNumber(measure.kind === "length" ? fromBookAmount(measure.inches, "length", units) : fromBookAmount(measure.pounds, "weight", units));
}

/** A best's size by the measure it is best by, or nothing when there is no such best. */
function measureOfBest(entry: CatchEntry | null, kind: "length" | "weight"): string {
  const measure = entry ? measureOf(entry, kind) : null;
  return measure ? measureText(measure) : "";
}

/** Common European fish the game's lake doesn't hold, so a Polish angler's okoń or sandacz is a known kind with its records. */
export const FIELD_SPECIES = ["European perch", "Zander", "Common bream", "Roach", "Chub", "Tench", "Asp", "Wels catfish", "Crucian carp", "Rudd", "Ide", "Brown trout", "Grayling", "Barbel", "European eel"];

// Not the game's made-up ghost pike: this is a log of real water.
const SPECIES = [...[...FISH].map((fish) => fish.name).filter((name) => name !== "Ghost pike"), ...FIELD_SPECIES];

/** The example fish: the reader's own perch, the yellow one in English and "Okoń" in Polish. */
const speciesHint = (lang: string) => (lang === "pl" ? "European perch" : "Yellow perch");

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
              {/* The largest named is the angler's own, as Bests and the cards' records say. */}
              <FishSum catches={catches} best={countedFish(catches)} />
              <SpeciesChips catches={catches} />
              <PagedCatches items={catches} monthOf={catchMonth} headLevel={2}>
                {(entry) => (
                  <CatchCard
                    key={entry.id}
                    entry={entry}
                    spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                    tripTitle={entry.tripId ? outingNameById(book, entry.tripId) : null}
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

/** When "Save and log another" was last pressed, so the fresh form it opens puts the cursor in the size. */
let anotherAt = 0;

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
  // Never the game's lake or one of its days for a new fish: those are landed by playing.
  const linkedTrip = existing ? undefined : tripById(book, params.get("trip") ?? "");
  const presetTrip = linkedTrip && linkedTrip.spotId !== PLAY_LAKE_ID ? linkedTrip : undefined;
  // A ?spot= that is no longer in the book (deleted, or an old link) falls back like no spot at all.
  const linkedSpot = params.get("spot") !== PLAY_LAKE_ID && book.spots.some((spot) => spot.id === params.get("spot")) ? params.get("spot") : null;
  // Opened without a water or outing ("Log a catch" anywhere): today's outing's water, else the one fished last. Worked out once.
  const [presetSpot] = useState(() => existing?.spotId ?? presetTrip?.spotId ?? linkedSpot ?? likelyWater(book, localDate(new Date()), new Date().getHours() < LATE_NIGHT_UNTIL));

  const asked = params.get("kind");
  const [species, setSpecies] = useState(existing ? t(existing.species) : t(params.get("species") ?? ""));
  const bestSoFar = speciesBestSoFar(book, species, t, existing?.id);
  // Starting values that look through the whole book are worked out once, not on every keystroke.
  const [measureKind, setMeasureKind] = useState<CatchDraft["measureKind"]>(
    () => existing?.measure.kind ?? (asked === "weight" || asked === "length" ? asked : (kindMeasure(book, t(params.get("species") ?? ""), t) ?? lastMeasureKind(book))),
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
  // Not the other measure, but still far past this kind's best: most likely the wrong unit, or a slip of a digit.
  const pastBest = otherMeasure ? null : farPastBest(bestSoFar, measureKind, typedAmount);
  const amountInput = useRef<HTMLInputElement>(null);
  // Arrived from "Save and log another": the address stays the same, so the shell moves no focus; the size is what to type
  // next. Timed rather than read from the address's state, which the saved note clears (and the form opens again).
  useEffect(() => {
    if (!existing && Date.now() - anotherAt < 2000) amountInput.current?.focus({ preventScroll: true });
  }, []);
  // Within a run of "Save and log another", Enter on a complete form keeps the run going; the Save button ends it.
  const [inRun] = useState(() => !existing && Date.now() - anotherAt < 2000);
  const likely = !(typedAmount > 0) ? null : measureKind === "length" ? likelyWeight(pairs, typedAmount) : likelyLength(pairs, typedAmount);
  const pickMeasureKind = (kind: CatchDraft["measureKind"]) => {
    // Both typed: switching which is the main measure swaps them, so each number stays with its kind.
    if (kind !== measureKind && alsoAmount.trim()) {
      setAmount(alsoAmount);
      setAlsoAmount(amount);
    }
    setMeasureKind(kind);
    setMeasurePicked(true);
  };
  // Until the player picks a measure or types a size, it follows how they last measured this kind: pike by length, panfish by weight.
  // The starting kind is set with the form; only a kind typed after that moves it. A measure the link asked for holds
  // while the fish is still the one the link named ("Save and log another" carries the last fish's measure).
  const [measurePicked, setMeasurePicked] = useState(false);
  const kindMounted = useRef(false);
  useEffect(() => {
    if (!kindMounted.current) {
      kindMounted.current = true;
      return;
    }
    const askedHolds = (asked === "weight" || asked === "length") && species.trim().toLowerCase() === t(params.get("species") ?? "").trim().toLowerCase();
    if (existing || measurePicked || askedHolds || amount.trim() || alsoAmount.trim()) return;
    const kind = kindMeasure(book, species, t);
    if (kind) setMeasureKind(kind);
    // Only a change of kind moves it, not a change of the size or the book.
  }, [species]);
  const [lure, setLure] = useState(() => t(existing ? existing.lure : (params.get("lure") ?? tripLure(book, presetTrip?.id))));
  const [spotId, setSpotId] = useState(presetSpot);
  // The kind's biggest at the water picked, once it differs from the biggest anywhere.
  // Sample fish only when the best anywhere is one too (a book still all samples for this kind).
  const sampleBest = [bestSoFar?.longest, bestSoFar?.heaviest].some((best) => best && isSampleCatch(best.id));
  const hereBest = spotId ? speciesBestSoFar({ ...book, catches: book.catches.filter((entry) => entry.spotId === spotId && (sampleBest || !isSampleCatch(entry.id))) }, species, t, existing?.id) : null;
  const hereDiffers = hereBest && (hereBest.longest?.id !== bestSoFar?.longest?.id || hereBest.heaviest?.id !== bestSoFar?.heaviest?.id);
  // The last fish's time, when "Save and log another" came from a fish of an earlier day.
  const startAt = existing ? null : params.get(AT_PARAM);
  const carriedTime = startAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startAt) ? startAt : null;
  // A new fish on a water with an outing planned that day (or last night, in the small hours) files under that outing:
  // the day of a carried time, else today.
  const [tripId, setTripId] = useState(() =>
    existing ? (existing.tripId ?? "") : (presetTrip?.id ?? tripForFish(book, presetSpot, carriedTime ?? toLocalInput(new Date()))?.id ?? ""),
  );
  // Until the player picks an outing themselves, the outing follows the water and the day.
  const [tripPicked, setTripPicked] = useState(Boolean(existing || presetTrip));
  // The outing a change of water took the fish off, until the outing is picked again.
  const [leftTrip, setLeftTrip] = useState("");
  // Set while a change of water is what took the fish off its own outing, so going back to that water can put it back.
  const [waterTookTrip, setWaterTookTrip] = useState(false);
  const [caughtAt, setCaughtAt] = useState(() =>
    existing ? toLocalInput(new Date(existing.caughtAt)) : (carriedTime ?? toLocalInput(startTimeFor(presetTrip, new Date(), lastFishOn(book, presetTrip?.id)))),
  );
  // Until the player sets the time themselves, picking an outing moves the catch to its day.
  const [timeTouched, setTimeTouched] = useState(Boolean(existing || carriedTime));
  // The time read from a photo's camera notes, while the time field still holds it.
  const [photoTime, setPhotoTime] = useState("");
  // When the camera noted one: offered beside the time when it didn't fill it.
  const [photoTaken, setPhotoTaken] = useState("");
  // The water a photo's location picked, while the water field still holds it.
  const [photoSpot, setPhotoSpot] = useState("");
  // Set once the player picks a water themselves; a photo's location doesn't overrule them.
  // A water brought in by a link (Log a fish on a water's page) counts as picked: a photo's place won't move it.
  const spotTouched = useRef(Boolean(linkedSpot));
  // Read when the photo's notes come in, so a time typed while they were read is kept.
  // The last fish's time carried by "Save and log another" is only a start: a photo's camera time still beats it,
  // until the player sets the time themselves.
  const timeFreeNow = useRef(false);
  timeFreeNow.current = !timeTouched || (carriedTime !== null && caughtAt === carriedTime && photoTime === "");
  // A game fish's note in the player's language, as its page shows it; saved back as stored while unchanged.
  const [note, setNote] = useState(existing ? noteText(existing.note) : "");
  const [released, setReleased] = useState(() => (existing ? existing.released === true : lastReleased(book)));
  const [sky, setSky] = useState(existing?.weather?.sky ?? "");
  const [wind, setWind] = useState(existing?.weather?.wind ?? "");
  const [startTemp] = useState(() => (existing?.weather?.waterTempF === undefined ? "" : inputNumber(fromBookTemp(existing.weather.waterTempF, units))));
  const [waterTemp, setWaterTemp] = useState(startTemp);
  // A temperature put in the box from the book (this fish's own, or one copied from the last fish), with the °F it
  // came from: saved as it was while the box still shows it, not rounded through °C and back.
  const [heldTemp, setHeldTemp] = useState(() =>
    existing?.weather?.waterTempF !== undefined ? { shown: startTemp, tempF: existing.weather.waterTempF } : null,
  );
  // Conditions are optional, but once one is noted the other two are needed.
  const weatherStarted = Boolean(sky || wind || waterTemp.trim());
  const [photo, setPhoto] = useState<string | null>(existing ? photoFor(existing.id) : null);
  // What it opened with, so a save that leaves the photo alone keeps one another tab added meanwhile.
  const [openedPhoto] = useState(photo);
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
          // By value, as the form shows it, so "1,5", "1.5" and "1.50" are one size.
          const size = measureOf(entry, measureKind);
          const typed = Number(toBookAmount(amount, measureKind, units));
          if (size === null || !Number.isFinite(typed)) return false;
          return fromBookAmount(size.kind === "length" ? size.inches : size.pounds, measureKind, units) === fromBookAmount(typed, measureKind, units);
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
    // The draft's measure was the player's: the kind it names doesn't move it.
    setMeasurePicked(true);
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
    focusSoon('input[name="species"]');
  };
  // From Home's "Pick it up": the fish comes back at once, not after the same question again.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || existing || !waiting || !params.has(RESUME_PARAM)) return;
    resumed.current = true;
    pickUp(waiting);
  });

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
  // The game's fish and tackle stay out of the real form's lists: a Ghost pike is no one's guess for "pike".
  const realBook = useMemo(() => ({ ...book, catches: book.catches.filter(offPlayLake) }), [book]);
  const speciesOptions = useMemo(
    () =>
      ownFirst(
        realBook.catches.map((entry) => entry.species),
        SPECIES,
        t,
      ).sort((a, b) => a.localeCompare(b)),
    [realBook, lang],
  );
  // A name one or two letters off one already known, offered before it starts a kind of its own.
  // Said once the name is typed and the field left, not while "Walley" is on its way to "Walleye".
  const [typingSpecies, setTypingSpecies] = useState(false);
  // "perch" alone is most likely the perch already in the book, not a kind of its own.
  const misspelt = typingSpecies ? null : (closeSpecies(species, speciesOptions) ?? fullSpecies(species, [...ownFirst(realBook.catches.map((entry) => entry.species), [], t), ...speciesOptions]));
  const lureOptions = useMemo(() => ownFirst(bookLures(realBook), BAITS, t), [realBook, lang]);
  // The same for a lure, so a typo doesn't split its tally in two.
  const [typingLure, setTypingLure] = useState(false);
  // Against every lure in the book, not just the dozen offered, so one used once isn't taken for a slip.
  const allLures = useMemo(() => ownFirst(bookLures(realBook, Number.MAX_SAFE_INTEGER), BAITS, t), [realBook, lang]);
  const misspeltLure = typingLure ? null : closeSpecies(lure, allLures);
  // Made once per water: a water fished for years lists hundreds of outings.
  const tripOptions = useMemo(
    () =>
      spotTrips.map((trip) => (
        <option key={trip.id} value={trip.id}>
          {formatDay(trip.date)} · {outingName(trip, book.spots)}
        </option>
      )),
    [spotTrips, lang],
  );
  const onlySampleWaters = !existing && book.spots.every((spot) => spot.id === PLAY_LAKE_ID || isSampleSpot(spot.id));
  const heading = existing ? t(existing.species) : presetTrip ? outingName(presetTrip, book.spots) : t("Log a catch");

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
    setLeftTrip(tripId ? (nextTrip !== tripId ? (outingNameById(book, tripId) ?? "") : "") : nextTrip ? "" : leftTrip);
    if (existing && tripId === existing.tripId) setWaterTookTrip(true);
    setTripId(nextTrip);
    setTripPicked(Boolean(existing));
  };

  const canLocate = !existing && canFindNearest(book);

  const pickedTrip = tripId ? tripById(book, tripId) : undefined;
  // The angler's own fish of the kind kept on this fish's day (its outing's, for a night session).
  const fishDayNow = pickedTrip?.date ?? caughtAt.slice(0, 10);
  const keptThatDay = existing || released ? 0 : speciesCatches(book, species, t).filter((entry) => ownFish(entry) && !entry.released && bookFishDay(book, entry) === fishDayNow).length;
  // The sun at the water picked, at the time typed.
  const formSpot = book.spots.find((spot) => spot.id === spotId);
  const formPlace = formSpot ? (formSpot.place ?? placeFor(formSpot.id)) : undefined;
  const typedAt = new Date(caughtAt);
  const formSun = formPlace && !Number.isNaN(typedAt.getTime()) ? sunMark(typedAt.toISOString(), formPlace) : null;
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
    if (!timeTouched) setCaughtAt(toLocalInput(startTimeFor(tripById(book, nextTrip), new Date(), lastFishOn(book, nextTrip))));
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
    // pinned water within a couple of km of where it was taken, if the water and outing haven't been picked. Otherwise
    // the photo's time is offered beside the time box.
    const canMoveWater = !existing && !tripPicked && !spotTouched.current;
    setPhotoTaken("");
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
        const usable = taken && taken <= toLocalInput(new Date()) ? taken : null;
        if (usable) setPhotoTaken(usable);
        const timed = !existing && timeFreeNow.current ? usable : null;
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
    void compressCatchPhoto(file).then(
      (result) => {
        if (photoPick.current !== ticket) return;
        setReducing(false);
        if (!result.ok) {
          setPhotoError(result.message);
          setPhotoTaken("");
          return;
        }
        setPhoto(result.dataUrl);
      },
      () => {
        if (photoPick.current !== ticket) return;
        setReducing(false);
        setPhotoError(t("That photo could not be read. Choose a JPEG, PNG, or WebP."));
        setPhotoTaken("");
      },
    );
  };

  // A control that takes itself away hands focus to the field it filled.
  const focusSoon = (selector: string) => setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus(), 0);
  const clearPhoto = () => {
    photoPick.current += 1;
    setReducing(false);
    setPhoto(null);
    setPhotoError("");
    setPhotoTaken("");
  };

  // An untouched number keeps its stored value, so a metric round trip doesn't nudge it; that holds for a length and
  // weight swapped between the two fields too.
  const bookAmount = (text: string, kind: CatchDraft["measureKind"]) => {
    const stored = existing ? measureOf(existing, kind) : null;
    return stored && text === measureAmountText(stored, units) ? String(stored.kind === "length" ? stored.inches : stored.pounds) : toBookAmount(text, kind, units);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (reducing) {
      setError(t("Wait for the photo to finish reducing."));
      return;
    }
    const draft: CatchDraft = {
      // A name already in the book is kept as written there, so "rock bass" joins "Rock bass", and an "Okoń" logged
      // before the list knew perch stays one kind with the next "Okoń", ahead of the list's "European perch".
      species: bookName(species, [...(existing ? [existing.species] : []), ...book.catches.map((entry) => entry.species), ...SPECIES]),
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
        heldTemp && waterTemp === heldTemp.shown ? String(heldTemp.tempF) : toBookTemp(waterTemp, units),
      released,
    };
    // Worked out against the book before this fish joins it.
    const parsed = existing ? null : parseCatchDraft(draft, book);
    const news = parsed?.ok ? catchNews(book, parsed.value) : null;
    const result = existing ? updateCatch(existing.id, draft, photo, openedPhoto) : addCatch(draft, photo);
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
    // "Save and log another": a fresh form on the same water, outing, fish, lure and measure, the time now; for a fish
    // of an earlier day, that fish's time, as the next one came after it that day.
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("name") === "another") {
      anotherAt = Date.now();
      // Not a fish from minutes ago, before midnight on tonight's session: the next one comes now, not at 23:58 again.
      const writtenUp = caughtAt.slice(0, 10) < toLocalInput(new Date()).slice(0, 10) && Date.now() - new Date(caughtAt).getTime() > 60 * 60_000;
      const earlier = writtenUp ? caughtAt : undefined;
      navigate(anotherCatchLink({ spotId, tripId: tripId || null, species: draft.species, lure: draft.lure, measure: { kind: measureKind } }, earlier), savedState("catch", news, parsed?.ok ? parsed.value.caughtAt : undefined));
      return;
    }
    navigate(tripId ? `/trips/${tripId}` : "/catches", savedState("catch", news, parsed?.ok ? parsed.value.caughtAt : undefined));
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

  // The game's lake alone is no water to log a real day on.
  if (!existing && !book.spots.some((spot) => spot.id !== PLAY_LAKE_ID)) {
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
              // The banner goes with its buttons: on to the form's first box.
              focusSoon('input[name="species"]');
            }}
          >
            {t("Let it go")}
          </button>
        </div>
      ) : null}
      <form
        className="entry-form"
        onSubmit={onSubmit}
        onKeyDown={(event) => {
          // Enter in the fish, size or lure with the form not yet complete goes on to the field still missing, as a
          // phone's "next" key says; a complete form still saves on Enter (and logs another, in a run of them).
          const field = event.target;
          if (event.key !== "Enter" || event.nativeEvent.isComposing || !(field instanceof HTMLInputElement)) return;
          // Enter on the photo picker or a tick box does what it does there, not a save.
          if (["file", "checkbox", "radio", "button", "submit"].includes(field.type)) return;
          if (event.currentTarget.checkValidity()) {
            // From any box on the form, so Enter in the second size or the water temperature doesn't end the run.
            const another = inRun ? event.currentTarget.querySelector<HTMLButtonElement>("button[name=another]") : null;
            if (another && !another.disabled) {
              event.preventDefault();
              event.currentTarget.requestSubmit(another);
            }
            return;
          }
          if (!["species", "amount", "lure"].includes(field.name)) return;
          // A field still missing comes first, even one above; else the one after.
          const missing = [...event.currentTarget.querySelectorAll<HTMLElement>("input:invalid, select:invalid, textarea:invalid")].find((each) => each !== field);
          const fields = [...event.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]), select, textarea")].filter((each) => !each.hasAttribute("disabled"));
          const next = missing ?? fields[fields.indexOf(field) + 1];
          if (!next) return;
          event.preventDefault();
          next.focus();
        }}
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
              // A phone's Enter goes on to the next field rather than sending a half-filled form.
              enterKeyHint="next"
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              onFocus={() => setTypingSpecies(true)}
              onBlur={() => setTypingSpecies(false)}
              placeholder={t(speciesHint(lang))}
              autoComplete="off"
              required
            />
            <datalist id="species-list">
              {speciesOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {misspelt ? (
              <small className="field-hint">
                {t("Did you mean")}{" "}
                <button type="button" className="text-button" onClick={() => {
                    setSpecies(misspelt);
                    // The hint goes once taken: the keyboard carries on from the box it filled.
                    focusSoon('input[name="species"]');
                  }}>
                  {misspelt}
                </button>
                ?
              </small>
            ) : null}
            {bestSoFar ? (
              <small className="field-hint">
                {t("Your biggest so far: {measures}", {
                  measures: [measureOfBest(bestSoFar.longest, "length"), measureOfBest(bestSoFar.heaviest, "weight")].filter(Boolean).join(" · "),
                })}
              </small>
            ) : null}
            {hereBest && hereDiffers ? (
              <small className="field-hint here-best">
                {t("At this water: {measures}", {
                  measures: [measureOfBest(hereBest.longest, "length"), measureOfBest(hereBest.heaviest, "weight")].filter(Boolean).join(" · "),
                })}
              </small>
            ) : null}
          </label>
          {hereSpecies.length > 0 ? (
            <p className="wide form-note lure-tips">
              {/* Which water these come from, with a way to it: on a phone the water's own field is further down. */}
              {t("From {water}:", { water: spotById(book, spotId)?.name ?? "" })}{" "}
              <button type="button" className="text-button" aria-label={t("Change water")} onClick={() => document.querySelector<HTMLSelectElement>('select[name="spot"]')?.focus()}>
                {t("change")}
              </button>{" "}
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
              enterKeyHint="next"
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
            <GramsHint units={units} kind={measureKind} text={amount} onUse={setAmount} box='input[name="amount"]' />
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
            <GramsHint units={units} kind={otherKind} text={alsoAmount} onUse={setAlsoAmount} box='input[name="alsoAmount"]' />
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
              ) : pastBest ? (
                t("That's far past your best {species} ({size}). Is the unit right?", { species: species.trim(), size: measureText(pastBest) })
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
              enterKeyHint="next"
              value={lure}
              onChange={(event) => setLure(event.target.value)}
              onFocus={() => setTypingLure(true)}
              onBlur={() => setTypingLure(false)}
              placeholder={t(BAITS[1])}
              autoComplete="off"
              required
            />
            <datalist id="bait-list">
              {lureOptions.map((bait) => (
                <option key={bait} value={bait} />
              ))}
            </datalist>
            {misspeltLure ? (
              <small className="field-hint">
                {t("Did you mean")}{" "}
                <button type="button" className="text-button" onClick={() => {
                    setLure(misspeltLure);
                    focusSoon('input[name="lure"]');
                  }}>
                  {misspeltLure}
                </button>
                ?
              </small>
            ) : null}
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
                <button
                  key={name}
                  type="button"
                  className="lure-tip"
                  onClick={() => {
                    setLure(t(name));
                    // The row goes once the lure is in: focus stays with the lure.
                    focusSoon('input[name="lure"]');
                  }}
                >
                  {t(name)}
                </button>
              ))}
            </p>
          ) : null}

          <div className="water-field">
            <label>
              {t("Water")}
              <select name="spot" aria-describedby={onlySampleWaters ? "own-water-hint" : undefined} value={spotId} onChange={(event) => onSpot(event.target.value)}>
                {/* The game's lake only for what is already there, and a game fish stays on it. */}
                {book.spots.filter((spot) => (existing?.spotId === PLAY_LAKE_ID ? spot.id === PLAY_LAKE_ID : spot.id !== PLAY_LAKE_ID || spot.id === spotId)).map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.name}
                  </option>
                ))}
              </select>
            </label>
            {photoSpot && photoSpot === spotId ? <span className="field-hint">{t("Water from the photo's location.")}</span> : null}
            {leftTrip ? <span className="field-hint">{t("No longer on {outing}: that outing was on another water.", { outing: leftTrip })}</span> : null}
            {canLocate ? <NearestWater book={book} onPick={onSpot} /> : null}
            {/* Only the sample week's made-up waters to pick from: the real one is a tap away. */}
            {onlySampleWaters ? (
              <span className="field-hint own-water" id="own-water-hint">
                {t("These waters are invented.")} <Link to="/spots/new?then=catch">{t("Add the one you fished")}</Link>
              </span>
            ) : null}
          </div>

          <label>
            {/* Named by this alone: the buttons beside the time keep their own names. */}
            <span id="caught-at-label">{t("Time")}</span>
            <input
              name="caughtAt"
              aria-labelledby="caught-at-label"
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
            {/* Back to the present after logging an earlier fish, without picking it out by hand. */}
            {!existing && Math.abs(Date.parse(caughtAt) - Date.now()) > 5 * 60_000 ? (
              <button
                type="button"
                className="text-button time-now"
                title={t("Set the time to now")}
                onClick={() => {
                  const now = toLocalInput(new Date());
                  setCaughtAt(now);
                  if (!tripPicked) setTripId(tripForFish(book, spotId, now)?.id ?? "");
                  setTimeTouched(true);
                  // "Now" goes once the time is now: focus stays on the time.
                  focusSoon('input[name="caughtAt"]');
                }}
              >
                {t("Now")}
              </button>
            ) : null}
            {/* Logged a little or a day after it was landed: a step back from the time shown, a tap each. */}
            {!existing ? (
              <span className="time-back">
                {[
                  [15, `−${t("{n} min", { n: 15 })}`],
                  [60, `−${t("{n} h", { n: 1 })}`],
                  // Logged the morning after: the same time a day back.
                  [24 * 60, `−${t("{n} day", { n: 1 })}`],
                  // Going through an outing fish by fish: the next one a little later, never past now.
                  [-15, `+${t("{n} min", { n: 15 })}`],
                ]
                  .filter(([minutes]) => Number(minutes) > 0 || new Date(caughtAt).getTime() + 15 * 60_000 <= Date.now())
                  .map(([minutes, label]) => (
                  <button
                    key={minutes}
                    type="button"
                    className="text-button"
                    onClick={() => {
                      const at = new Date(caughtAt);
                      if (Number.isNaN(at.getTime())) return;
                      // A day back by the calendar, so the clock change doesn't move the hour.
                      const back = minutes === 24 * 60 ? new Date(at.getFullYear(), at.getMonth(), at.getDate() - 1, at.getHours(), at.getMinutes()) : new Date(at.getTime() - Number(minutes) * 60_000);
                      const earlier = toLocalInput(back);
                      setCaughtAt(earlier);
                      if (!tripPicked) setTripId(tripForFish(book, spotId, earlier)?.id ?? "");
                      setTimeTouched(true);
                      // "+15 min" leaves once the time is within 15 minutes of now: the focus goes back to the time.
                      if (Number(minutes) < 0 && back.getTime() + 15 * 60_000 > Date.now()) focusSoon('input[name="caughtAt"]');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </span>
            ) : null}
            {/* Where the time sits against the sun at the water, as the catch page will say it. */}
            {formSun ? <span className="field-hint">{sunMarkText(formSun)}</span> : null}
            {photoTime && photoTime === caughtAt ? <span className="field-hint">{t("Taken from the photo.")}</span> : null}
            {/* The time was set first, or the fish was already in the book: the photo's own time is a tap away. */}
            {photoTaken && photoTaken !== caughtAt ? (
              <span className="field-hint">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setCaughtAt(photoTaken);
                    setPhotoTime(photoTaken);
                    if (!tripPicked) setTripId(tripForFish(book, spotId, photoTaken)?.id ?? "");
                    setTimeTouched(true);
                    focusSoon('input[name="caughtAt"]');
                  }}
                >
                  {t("Use the photo's time ({time})", {
                    time: photoTaken.slice(0, 10) === caughtAt.slice(0, 10) ? formatTimeOfDay(photoTaken) : formatClock(photoTaken),
                  })}
                </button>
              </span>
            ) : null}
            {Date.parse(caughtAt) - Date.now() > 5 * 60_000 ? (
              <span className="field-hint" role="status">
                {t("That time is still to come. Is the day right?")}
              </span>
            ) : null}
          </label>

          <label>
            {t("Outing")}
            <select name="trip" value={tripId} onChange={(event) => onTrip(event.target.value)}>
              <option value="">{t("Not on a trip")}</option>
              {tripOptions}
            </select>
          </label>
          {/* A small-hours fish on last evening's outing is on its day. */}
          {/* An outing still ahead: no fish is on it yet, and none can be moved there. */}
          {pickedTrip && caughtAt && pickedTrip.date > localDate(new Date()) ? (
            <p className="wide form-note" role="status">
              {t("This outing is still to come.")}
            </p>
          ) : pickedTrip && caughtAt && !fishOnOutingDay(book, pickedTrip.spotId, caughtAt, pickedTrip.date, true) ? (
            <p className="wide form-note" role="status">
              {t("This outing was on {day}; the fish is dated another day.", { day: formatDay(pickedTrip.date) })}{" "}
              {/* The same clock time, on the outing's day: a fish moved to another outing keeps its old date otherwise. */}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  // A small-hours time goes to the night after the outing's day, so it stays on that session.
                  setCaughtAt(`${Number(caughtAt.slice(11, 13)) < LATE_NIGHT_UNTIL ? dayAfter(pickedTrip.date) : pickedTrip.date}${caughtAt.slice(10)}`);
                  setTimeTouched(true);
                  focusSoon('input[name="caughtAt"]');
                }}
              >
                {t("Move it to {day}", { day: formatDay(pickedTrip.date) })}
              </button>
            </p>
          ) : null}

          {/* A fish lost or a strike missed while writing this one up: counted on the outing without leaving the form. */}
          {pickedTrip && !existing && pickedTrip.date <= localDate(new Date()) && pickedTrip.spotId !== PLAY_LAKE_ID ? (
            <div className="wide">
              <TripCounts trip={pickedTrip} landed={book.catches.filter((entry) => entry.tripId === pickedTrip.id).length} />
            </div>
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
                  const shown = offeredWeather.waterTempF === undefined ? "" : inputNumber(fromBookTemp(offeredWeather.waterTempF, units));
                  setWaterTemp(shown);
                  setHeldTemp(offeredWeather.waterTempF === undefined ? null : { shown, tempF: offeredWeather.waterTempF });
                  focusSoon('select[name="sky"]');
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
              placeholder={t("e.g. {n}", { n: units === "metric" ? "14" : "58" })}
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
            </label>
            {/* Outside the label, so it is read once, as the field's description. */}
            <small className="field-hint" id="photo-limit">
              {t(
                "One photo, kept in this browser with the catch. Large files are reduced. Anything still over {kb} KB is turned away so it cannot crowd out the book.",
                { kb: CATCH_PHOTO_MAX_BYTES / 1024 },
              )}
            </small>
            {photo ? <img className="catch-photo-preview" src={photo} alt={t("Selected catch photo")} /> : null}
            {photo ? (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  clearPhoto();
                  focusSoon('.entry-form input[type="file"]');
                }}
              >
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
          {/* A fish kept: how many of the kind that day, this one too, for a bag limit. */}
          {!existing && !released && keptThatDay > 0 ? (
            <small className="field-hint form-kept">{t("{species} kept that day, this one included: {count}", { species: t(species.trim()), count: keptThatDay + 1 })}</small>
          ) : null}
          {/* Ticked like the last fish, far down the form: said beside the save, with a way to keep this one. */}
          {!existing && released ? (
            <small className="field-hint form-released">
              {t("Goes in as released.")}{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setReleased(false);
                  focusSoon('.form-save button[type="submit"]');
                }}
              >
                {t("Kept it")}
              </button>
            </small>
          ) : null}
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
  const time = hours === 0 ? t("{n} min", { n: minutes }) : minutes === 0 ? t("{n} h", { n: hours }) : t("{h} h {n} min", { h: hours, n: minutes });
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
  useStepKeys();
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
  const listIndex = list ? list.rows.findIndex((row) => row.id === entry.id) : -1;
  // A past outing's page lists its fish first fish first: the count goes as the page reads.
  const listTrip = list?.key.startsWith("trip:") ? tripById(book, list.key.slice(5)) : undefined;
  const listAt = list ? (listTrip && listTrip.date < localDate(new Date()) ? list.rows.length - listIndex : listIndex + 1) : 0;
  const badge = catchBadge(book, entry);
  // Newest first, so the oldest fish of the kind is number one.
  const kind = catchesOfSpecies(book, entry.species);
  // Its number among the fish its kind's page lists; a game fish among the game's.
  const onPage = kindOnPage(book, entry.species);
  // A game fish counts among the game's, a sample fish beside the angler's own among the rest of the sample week.
  const eyebrowKind = onPage.some((other) => other.id === entry.id)
    ? onPage
    : kind.filter((other) => (other.spotId === PLAY_LAKE_ID) === (entry.spotId === PLAY_LAKE_ID) && isSampleCatch(other.id) === isSampleCatch(entry.id));
  const kindNumber = eyebrowKind.length - eyebrowKind.findIndex((other) => other.id === entry.id);
  const counted = countedFish(kind);
  const isCounted = counted.some((other) => other.id === entry.id);
  // The counts below hold the angler's own fish of the kind; when the sample week still has some, their links leave it out.
  const noSample = kind.some((other) => isSampleCatch(other.id)) && !counted.some((other) => isSampleCatch(other.id)) ? ` -${t("sample|search word")}` : "";
  // Short of a best, where it sits among the angler's own others of its kind.
  const rank = isCounted ? sizeRank(counted, entry) : null;
  // A game or sample fish among the angler's own has no place in their run of sizes.
  const since = badge || !isCounted ? null : biggestSince(counted, entry);
  // Measured and weighed: a fat fish or a thin one, against the angler's own others of its kind.
  const build = isCounted ? forItsLength(counted, entry) : null;
  // Back after a long spell without one, opening the one before.
  const gap = isCounted ? longGap(counted, entry) : null;
  // Short of a best of its kind, the day's best: the biggest of its outing.
  const outingBest = !badge && trip && trip.spotId !== PLAY_LAKE_ID && biggestOnOuting(book.catches.filter((other) => other.tripId === trip.id), entry);
  // The others of its kind that round to the same size, through the one-size search.
  // Counted among the angler's own fish only, as the year line is: the link leaves the game's lake out too.
  const countedIds = new Set(counted.map((other) => other.id));
  const sizeSearch = [exactTerm("species", t(entry.species)), `${withoutPlayLake(book, sameSizeSearch(entry.measure, getUnits() === "metric"), kind)}${noSample}`] as const;
  const sameSize = isCounted && counted.length > 1 ? findCatches(book, `${sizeSearch[0]} + ${sizeSearch[1]}`, t, (id) => photoFor(id) !== null).filter((other) => countedIds.has(other.id)).length : 0;
  // The fish this lure has taken at this water, this one among them: whether it is the water's lure.
  const lureHere = spot && entry.lure.trim() ? ([exactTerm("lure", t(entry.lure)), exactTerm("water", spot.name)] as const) : null;
  const lureHereCount = lureHere ? findCatches(book, `${lureHere[0]} + ${lureHere[1]}`, t, (id) => photoFor(id) !== null).length : 0;
  // A bigger one of its kind on the same lure: what this lure can do.
  const lureKey = entry.lure.trim().toLowerCase();
  const onLure = isCounted && lureKey ? counted.filter((other) => other.lure.trim().toLowerCase() === lureKey && measureOf(other, entry.measure.kind)) : [];
  const lureTop = onLure.length > 1 ? personalBests({ spots: [], trips: [], catches: onLure }) : null;
  const lureBestFish = lureTop ? (entry.measure.kind === "weight" ? lureTop.heaviest : lureTop.longest) : null;
  const lureBest = lureBestFish && lureBestFish.id !== entry.id ? lureBestFish : null;
  // The day as the calendar and its search count it: a night session's small hours on its outing's day.
  const caughtDay = bookFishDay(book, entry);
  // Where the fish's time sat against the sun at its water, for a water with a place.
  const place = spot ? (spot.place ?? placeFor(spot.id)) : undefined;
  const sun = place ? sunMark(entry.caughtAt, place) : null;
  // A real fish's day leaves the game's rounds out, as Home's "Every fish that day" does.
  const dayFish = book.catches.filter((other) => bookFishDay(book, other) === caughtDay && (offPlayLake(other) || !offPlayLake(entry)));
  const sameDay = dayFish.length;
  const dayLink = findLink(offPlayLake(entry) ? withoutPlayLake(book, caughtDay, book.catches.filter((other) => bookFishDay(book, other) === caughtDay)) : caughtDay);
  const milestone = milestoneOf(book, entry);
  // The first of its kind at this water, once another has followed it there: the book's first says so already.
  const atWater = spot && isCounted ? counted.filter((other) => other.spotId === entry.spotId) : [];
  // Two fish logged in the same minute go by id, as the milestones order them.
  const firstHere = !(milestone?.of === "kind" && milestone.n === 1) && atWater.length > 1 && atWater.every((other) => other.id === entry.id || byTime(entry, other) < 0);
  // The fish of its kind that year, through the catch search.
  const caughtYear = String(new Date(entry.caughtAt).getFullYear());
  // Said only on the angler's own fish, leaving the game's lake out; counted as the link opens them, so the two agree.
  const yearSearch = [exactTerm("species", t(entry.species)), `${withoutPlayLake(book, caughtYear, kind.filter((other) => String(new Date(other.caughtAt).getFullYear()) === caughtYear))}${noSample}`] as const;
  const yearCount = isCounted ? findCatches(book, `${yearSearch[0]} + ${yearSearch[1]}`, t, (id) => photoFor(id) !== null).filter((other) => countedIds.has(other.id)).length : 0;
  // The water's 10° band, and the fish caught under the same sky and wind in it, counted as the link opens them.
  const tempBand =
    entry.weather?.waterTempF === undefined
      ? null
      : tempBandSearch(waterTempTally({ spots: [], trips: [], catches: [{ ...entry, weather: { ...entry.weather, waterTempF: Math.round(entry.weather.waterTempF * 10) / 10 } }] }).find((row) => row.count > 0)!);
  // Only on the angler's own counted fish: a game or sample fish isn't among what the count holds.
  const sameConditions = entry.weather && isCounted
    ? (() => {
        const base = [exactTerm("sky", t(SKY_LABELS[entry.weather.sky])), exactTerm("wind", t(WIND_LABELS[entry.weather.wind])), ...(tempBand ? [tempBand] : [])].join(" + ");
        const rows = findCatches(book, base, t);
        const search = countedSearch(book, base, rows);
        return { search, count: findCatches(book, search, t).length };
      })()
    : null;
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
  // Which best the badge is for: a fish both measured and weighed may hold either. Among the fish the badge was
  // drawn from (countedFish), or a sample fish would hold the weight and the angler's own heaviest read as "longest".
  const bests = badge ? personalBests({ ...book, catches: countedFish(book.catches) }) : null;
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
          {/* A game fish's kind opens the game's fish of that kind, as it is counted here. */}
          {/* A sample fish beside the angler's own opens the sample week's of that kind. */}
          <Link
            to={
              onPage.some((other) => other.id === entry.id) || !spot
                ? speciesLink(entry.species)
                : entry.spotId === PLAY_LAKE_ID
                  ? findWithLink(exactTerm("water", spot.name), exactTerm("species", t(entry.species)))
                  : findWithLink(exactTerm("species", t(entry.species)), t("sample|search word"))
            }
          >
            {eyebrowKind.length > 1
              ? t("{species}: {n} of {total}", { species: t(entry.species), n: kindNumber, total: eyebrowKind.length })
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
            <Link to={dayLink} aria-label={t("{when}, every fish that day ({count})", { when: formatClock(entry.caughtAt), count: sameDay })}>
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
        {outingBest && trip ? (
          <p className="meta outing-best">
            <Link to={`/trips/${trip.id}`}>{t("Biggest fish of the outing")}</Link>
          </p>
        ) : null}
        {gap ? (
          <p className="meta long-gap">
            <Link to={`/catches/${gap.before.id}`}>{t("The first {species} in {n} days", { species: t(entry.species), n: gap.days })}</Link>
          </p>
        ) : null}
        {build ? (
          <p className="meta for-its-length">
            {t(build.heavy ? "Heavy for its length: about {size} is usual." : "Light for its length: about {size} is usual.", { size: measureText({ kind: "weight", pounds: build.usual }) })}
          </p>
        ) : null}
        {since ? (
          <p className="meta biggest-since">
            <Link to={`/catches/${since.id}`}>{t("The biggest {species} since {day}", { species: t(entry.species), day: formatCatchDay(since.caughtAt) })}</Link>
          </p>
        ) : null}
        {sameSize > 1 ? (
          <p className="meta same-size">
            <Link to={findWithLink(...sizeSearch)}>{t("{species} of this size: {count}", { species: t(entry.species), count: sameSize })}</Link>
          </p>
        ) : null}
        {lureBest ? (
          <p className="meta lure-best">
            <Link to={`/catches/${lureBest.id}`}>
              {t("Biggest {species} on {lure}: {size}, {day}", {
                species: t(entry.species),
                lure: t(entry.lure),
                size: measureText(measureOf(lureBest, entry.measure.kind)!),
                day: formatDay(localDate(new Date(lureBest.caughtAt))),
              })}
            </Link>
          </p>
        ) : null}
        {lureHere && lureHereCount > 1 ? (
          <p className="meta lure-here">
            <Link to={findWithLink(...lureHere)}>{t("On {lure} at {water}: {count}", { lure: t(entry.lure), water: spot!.name, count: fishCountLabel(lureHereCount) })}</Link>
          </p>
        ) : null}
        {firstHere ? (
          <p className="meta first-here">
            <Link to={findWithLink(exactTerm("water", spot!.name), `${exactTerm("species", t(entry.species))}${noSample}`)}>{t("First {species} here.", { species: t(entry.species) })}</Link>
          </p>
        ) : null}
        {yearCount > 1 ? (
          <p className="meta kind-year">
            <Link to={findWithLink(...yearSearch)}>{t("{species} in {year}: {count}", { species: t(entry.species), year: caughtYear, count: yearCount })}</Link>
          </p>
        ) : null}
        {milestone ? (
          <p className="meta milestone">
            {milestone.of === "book" ? (
              t("Your fish no. {n}.", { n: milestone.n })
            ) : (
              <Link to={`/species/${encodeURIComponent(entry.species)}`}>
                {milestone.n === 1 ? t("Your first {species}.", { species: t(entry.species) }) : t("{species} no. {n}.", { species: t(entry.species), n: milestone.n })}
              </Link>
            )}
          </p>
        ) : null}
      </EditDelete>
      {photo ? (
        <PhotoFull
          src={photo}
          alt={t("Photo of {species}", { species: t(entry.species) })}
          name={`${t(entry.species)} ${caughtDay}`}
          caption={[t(entry.species), measuresText(entry), formatDay(caughtDay), ...(spot ? [spot.name] : [])].join(" · ")}
        />
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
                  <Link to={findLink(tempBand!)}>{tempText(entry.weather.waterTempF)}</Link>
                </>
              )}
            </p>
            {/* All three together: how this sky, wind and water have fished, among the angler's own. */}
            {sameConditions && sameConditions.count > 1 ? (
              <p className="meta same-conditions">
                <Link to={findLink(sameConditions.search)}>{t("Fish in these conditions: {count}", { count: sameConditions.count })}</Link>
              </p>
            ) : null}
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
      <CopySummary text={() => catchSummary(entry, spot?.name ?? null, trip ? outingName(trip, book.spots) : null)} file="stillwater-catch.txt" photo={photo} />
      {trip ? (
        <p className="trip-link">
          {t("Outing:")} <Link id="catch-outing" to={`/trips/${trip.id}`}>{outingName(trip, book.spots)}</Link>
          {tripFish > 1 ? ` · ${fishCountLabel(tripFish)}` : null}
        </p>
      ) : looseTrip ? (
        <p className="trip-link">
          {t("An outing on this water that day:")} <Link to={`/trips/${looseTrip.id}`}>{outingName(looseTrip, book.spots)}</Link>{" "}
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
      ) : entry.spotId === PLAY_LAKE_ID ? null : (
        // No outing that day on this water: one can be made around the fish, so its day gets the outing's counts and pace.
        <p className="trip-link">
          <Link to={`/trips/new?${new URLSearchParams({ spot: entry.spotId, date: looseOutingDay(book, entry), loose: "1" }).toString()}`}>
            {t("Make an outing of this day")}
          </Link>
        </p>
      )}
      <p className="another-catch">
        {/* Not from a game fish: another like it would be logged on the game's lake. */}
        {entry.spotId === PLAY_LAKE_ID ? null : (
          <Link to={anotherCatchLink({ ...entry, tripId: outingGoesOn(book, entry.tripId) ? entry.tripId : null })} className="field-primary inline">
            {t("Log another like this")}
          </Link>
        )}
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
      {/* Outside a list of its kind, the steps can keep to this kind alone. */}
      {/* Its kind's list is the one its page shows, which leaves a game or sample fish out: offered only when this one is in it. */}
      {onPage.length > 1 && onPage.some((other) => other.id === entry.id) && !list?.key.startsWith("species:") ? (
        <p className="catch-list-at">
          <Link to={catchLink(entry.id, `species:${entry.species}`)}>{t("Step through {species} only", { species: t(entry.species) })}</Link>
        </p>
      ) : null}
      {list ? (
        <p className="catch-list-at">
          <Link to={list.back}>{t("Back to this list, {at} of {count}", { at: listAt, count: list.rows.length })}</Link>
        </p>
      ) : null}
    </div>
  );
}
