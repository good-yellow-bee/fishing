import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { MapAnchor } from "./MapAnchor";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  WATER_LABELS,
  WATER_TYPES,
  type Logbook,
  type WaterType,
  biteTimes,
  catchesForSpot,
  fishCountsByTrip,
  localDate,
  personalBests,
  shiftDate,
  spotById,
  tripsForSpot,
  type CatchEntry,
  type Trip,
  parseSpotPlace,
  foldText,
} from "@stillwater/shared";
import { bookLureName, pieceTally } from "./pieceTally";
import { CatchCard, SpotCard, TripCard } from "./cards";
import { PagedCatches } from "./PagedCatches";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { TallyBars } from "./TallyBars";
import { WaterTipsBox } from "./WaterTipsBox";
import { exactTerm, findWithLink } from "./findLinks";
import { bookKindName, kindKey, kindOnPage, speciesCounts, speciesLink } from "./speciesLink";
import { SpeciesChips } from "./SpeciesChips";
import { daysBetween, foldName, lastOutByWater, nearestPinned, spotsByLastFish, twinName } from "./spotOrder";
import { bookFishDay, yearTally } from "./tripMonths";
import { PagedTrips } from "./PagedTrips";
import { outingAverage, outingStreak, topOuting, weekendSplit } from "./outingAverage";
import { inReadersOrder, notYetThisYear } from "./bests/notYet";
import { mostKindsDay } from "./bests/mostKinds";
import { CopySummary } from "./CopySummary";
import { spotSummary, watersSummary } from "./summaries";
import { EditDelete } from "./EditDelete";
import { fishCountLabel, formatDay, formatTimeOfDay, messageText, outingName, outingNameById, tripWhen, waterName } from "./format";
import { outingCounted, outingDay, outNow, outNowAt, plainName } from "./tripDates";
import { newestOutingFirst } from "./catchNeighbors";
import { useLogbook } from "./LogbookState";
import { getUnits, locale, num, t, tn, useT } from "../i18n";
import { tempText } from "../i18n/content";
import { lastReading, readingBefore, tempThroughYear } from "./waterTips";
import { sunTimes } from "./sunTimes";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { useKeptForm } from "./keptForm";
import { ChoiceRow } from "./ChoiceRow";
import { countedBook, hasOwnEntries } from "./milestones";
import { PhotoStrip } from "./SpeciesPage";
import { formatCoord, placeFor } from "./map/places";
import { hookTally, hookText } from "./hookTally";
import { MonthBars } from "./MonthBars";
import { BiggestHere } from "./BiggestHere";
import { MERGE_PARAM, MergeWater } from "./MergeWater";
import { mergedInto, readMergedWaters } from "./waterMerge";
import { notesHere } from "./outingNotes";
import { largestFirst } from "./largestFirst";
import { MatchOrder, useLargestOrder } from "./MatchOrder";
import { PLAY_LAKE_ID } from "./playLake";
import { isSampleSpot, nextRealTrips, withoutSamplePlans } from "./bookCopy";
import { canGoBack, pageBefore } from "./FieldShell";
import { noteAddedWater } from "./addedWater";
import { bestLureAt } from "./waterLure";
import { useTypedParam } from "./typedParam";
import { CopyPlace } from "./CopyPlace";
import { distanceText } from "./NearestWater";
import { seasonWaters } from "./seasonWaters";
import { datedName, downloadFile } from "./download";
import { fileSlug, gpxFor } from "./gpx";
import { keepDraft, readKeptDraft } from "./catchDraft";
import { editFromPage, leaveDeleted, leaveSaved } from "./leaveDeleted";
import { savedState, sayAfterBack } from "./SavedNote";

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

/** Past this many waters, the list offers a box to find one by name. */
const FIND_WATER_FROM = 8;
/** In the address: the name the list is narrowed to. */
const WATER_FIND = "q";

/** How long a water's last temperature is worth showing on its card: after a month it says little about the water now. */
const TEMP_FRESH_DAYS = 30;

/** A water's last temperature noted with a fish, and its day, while that day is within TEMP_FRESH_DAYS of today. */
/** `dayOf` gives the day the reading's fish counts on (a night's small hours on its outing's); without it, the clock's. */
export function recentTemp(
  catches: readonly CatchEntry[],
  spotId: string,
  today: string,
  dayOf: (entry: CatchEntry) => string = (entry) => localDate(new Date(entry.caughtAt)),
): { fahrenheit: number; day: string; trend?: "warming" | "cooling" } | null {
  const here = catches.filter((entry) => entry.spotId === spotId);
  const last = lastReading(here);
  if (!last) return null;
  const entry = here.find((found) => found.id === last.id);
  const day = entry ? dayOf(entry) : localDate(new Date(last.at));
  if (day > today || daysBetween(day, today) > TEMP_FRESH_DAYS) return null;
  // Which way the water is going, against a reading of the weeks before that reads differently, as the water's page says it.
  const before = readingBefore(here, last, (fahrenheit) => tempText(fahrenheit) !== tempText(last.fahrenheit));
  return { fahrenheit: last.fahrenheit, day, ...(before ? { trend: last.fahrenheit > before.fahrenheit ? ("warming" as const) : ("cooling" as const) } : {}) };
}

/**
 * Each outing's fish on one water: its own, and the fish logged off any outing on its day when it is that day's one
 * outing here (of a dawn and a dusk, a loose fish is neither's until filed), as Trips counts them. A fish counts on the
 * day it counts on, a night's small hours on its evening's.
 */
function outingFishHere(book: Logbook, fishByTrip: ReadonlyMap<string, number>, fish: readonly CatchEntry[], trips: readonly Trip[]) {
  const looseByDay = new Map<string, number>();
  for (const entry of fish) if (!entry.tripId) looseByDay.set(bookFishDay(book, entry), (looseByDay.get(bookFishDay(book, entry)) ?? 0) + 1);
  const dayOf = new Map(trips.map((trip) => [trip.id, trip.date]));
  const outingsOnDay = new Map<string, number>();
  for (const trip of trips) outingsOnDay.set(trip.date, (outingsOnDay.get(trip.date) ?? 0) + 1);
  const fishOn = (id: string) => (fishByTrip.get(id) ?? 0) + (outingsOnDay.get(dayOf.get(id) ?? "") === 1 ? (looseByDay.get(dayOf.get(id) ?? "") ?? 0) : 0);
  return { fishOn, looseByDay };
}

export function SpotsPage() {
  // The sample week's blank plans stay out beside a water of the angler's own, as Trips leaves them out.
  const book = withoutSamplePlans(useLogbook().book);
  useT();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = nextRealTrips(book, today);
  const [storedOrder, setOrder] = useState(readSpotOrder);
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
  // By the angler's own fish, as the catch form guesses the water: a sample week dated after a back-filled season
  // doesn't put its made-up waters on top. The cards still count every fish on their water.
  // Decided for the whole book, as each water's outings are below: the sample's fish go with the angler's first outing too.
  const countedCatches = countedBook(book).catches;
  const ownRows = spotsByLastFish({ ...book, catches: countedCatches });
  const ownOrder = new Map(ownRows.map((row, index) => [row.spot.id, index]));
  rows.sort((a, b) => (ownOrder.get(a.spot.id) ?? 0) - (ownOrder.get(b.spot.id) ?? 0));
  // The order picked holds while its control shows: a list cut to two waters goes back to the last fish.
  const order: SpotOrder = rows.length > 2 ? storedOrder : "fish";
  const fishOnTrip = fishCountsByTrip(book);
  // The outing the angler is out on at each water, as the water's page and the Map say it.
  const outNowName = (spotId: string) => {
    const going = outNowAt(book, spotId);
    return going ? outingName(going, book.spots) : null;
  };
  // How long a water has rested, as its page says it: none while last evening's outing there is still going.
  const restOf = (spotId: string) => {
    const last = lastOut.get(spotId)!;
    return outNowAt(book, spotId)?.date === last ? 0 : daysBetween(last, today);
  };
  // The water left alone longest first, to give a rested one a go; waters never fished after them.
  // The angler's own outings and fish, as each water's page counts them: a sample water they have fished too counts
  // theirs, not the sample week's beside them. A water with nothing of theirs keeps what it has.
  const counted = countedBook(book);
  // Last evening's outing, still going in the small hours, is no finished blank yet, as Trips and Home take it.
  const fishedBy = outingDay(today);
  const ownLastOut = lastOutByWater(counted, fishedBy);
  const lastOut = new Map([...lastOutByWater(book, fishedBy)].map(([id, day]) => [id, ownLastOut.get(id) ?? day]));
  // Fish as the page sums them: the sample week's go with the angler's first fish.
  const ownRow = new Map(ownRows.map((row) => [row.spot.id, row]));
  const ownTrips = (id: string) => counted.trips.filter((trip) => trip.spotId === id);
  const season = seasonWaters(book, today);
  const withPlace = book.spots.filter((spot) => spot.place && spot.id !== PLAY_LAKE_ID);
  const placed = withPlace.some((spot) => !isSampleSpot(spot.id)) ? withPlace.filter((spot) => !isSampleSpot(spot.id)) : withPlace;
  const ownHere = (id: string) => id !== PLAY_LAKE_ID && ((ownRow.get(id)?.fishCount ?? 0) > 0 || ownTrips(id).length > 0);
  // Outings fished, as the water's own page counts them: not those still planned, and today's once it has a fish, a fish
  // lost or a strike missed.
  const fishAt = (catches: readonly CatchEntry[]) => {
    const bySpot = new Map<string, CatchEntry[]>();
    for (const entry of catches) {
      const list = bySpot.get(entry.spotId);
      if (list) list.push(entry);
      else bySpot.set(entry.spotId, [entry]);
    }
    return bySpot;
  };
  const [ownFishAt, allFishAt] = [fishAt(countedCatches), fishAt(book.catches)];
  const kindName = bookKindName(book.catches);
  const lureName = bookLureName(book.catches);
  const fishedHere = (id: string) => {
    const own = ownHere(id);
    const trips = own ? ownTrips(id) : tripsForSpot(book, id);
    const { fishOn } = outingFishHere(book, fishOnTrip, (own ? ownFishAt : allFishAt).get(id) ?? [], trips);
    return trips.filter((trip) => outingCounted(book, trip, fishedBy, fishOn(trip.id))).length;
  };
  // Each card's own count, as "Most fish" orders them.
  const shownCount = (row: { spot: { id: string }; fishCount: number }) => (ownHere(row.spot.id) ? ownRow.get(row.spot.id)?.fishCount ?? 0 : row.fishCount);
  const shownLastFish = (row: { spot: { id: string }; lastFishDay: string | null }) => (ownHere(row.spot.id) ? ownRow.get(row.spot.id)?.lastFishDay ?? null : row.lastFishDay);
  // Ties by name under every order, so two waters never fished keep one place.
  const tidyOrder = (a: { spot: { name: string } }, b: { spot: { name: string } }) => waterName(a.spot.name).localeCompare(waterName(b.spot.name), locale());
  if (order === "name") rows.sort(tidyOrder);
  if (order === "most") rows.sort((a, b) => shownCount(b) - shownCount(a) || tidyOrder(a, b));
  if (order === "rested") {
    rows.sort((a, b) => {
      const x = lastOut.get(a.spot.id);
      const y = lastOut.get(b.spot.id);
      return (!x ? (y ? 1 : 0) : !y ? -1 : x < y ? -1 : x > y ? 1 : 0) || tidyOrder(a, b);
    });
  }
  // Once the angler has an outing or a fish of their own, as Home counts their waters, the sample week's invented
  // waters with nothing of theirs follow theirs under every order: by name or by the most fish they would sit among,
  // or above, the angler's own.
  const ownAny = hasOwnEntries(book);
  const invented = (row: { spot: { id: string } }) => ownAny && isSampleSpot(row.spot.id) && !ownHere(row.spot.id);
  if (ownAny) rows.sort((a, b) => Number(invented(a)) - Number(invented(b)));
  rows.sort((a, b) => Number(a.spot.id === PLAY_LAKE_ID) - Number(b.spot.id === PLAY_LAKE_ID));
  // With rivers and lakes both in the book, the list can narrow to one kind of water; the game's lake shows under all.
  const types = WATER_TYPES.filter((type) => rows.some((row) => row.spot.id !== PLAY_LAKE_ID && row.spot.waterType === type));
  // Kept in the address, so Back from a water returns to the kind picked.
  const [params, setParams] = useSearchParams();
  const asked = params.get("kind");
  const kind = (WATER_TYPES as readonly string[]).includes(asked ?? "") ? (asked as WaterType) : "all";
  const setKind = (next: WaterType | "all") =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next === "all") out.delete("kind");
        else out.set("kind", next);
        return out;
      },
      { replace: true },
    );
  const shownKind = kind !== "all" && types.includes(kind) ? kind : "all";
  // A long list narrows by name, accents and case aside; kept in the address like the kind, so Back keeps it.
  const finding = rows.length > FIND_WATER_FROM;
  const [typedQuery, setQuery] = useTypedParam(WATER_FIND);
  const query = finding ? typedQuery : "";
  const needle = foldText(query.trim()).toLowerCase();
  const byName = (row: { spot: { name: string } }) => !needle || foldText(row.spot.name).toLowerCase().includes(needle);
  const shownRows = (shownKind === "all" ? rows : rows.filter((row) => row.spot.id !== PLAY_LAKE_ID && row.spot.waterType === shownKind)).filter(byName);
  // Waters of that name under another kind: the kind picked hides them, so say so and offer them.
  // A water's longest and heaviest fish: what the card names as its best.
  const bestsAt = (catches: readonly CatchEntry[], spotId: string) => personalBests({ ...book, catches: catches.filter((entry) => entry.spotId === spotId) });
  const ownShown = shownRows.filter((row) => row.spot.id !== PLAY_LAKE_ID && !invented(row));
  const sampleShown = shownRows.filter((row) => row.spot.id !== PLAY_LAKE_ID && invented(row));
  const gameShown = shownRows.filter((row) => row.spot.id === PLAY_LAKE_ID);
  // Labelled only below waters of the angler's own: alone, the sample week's or the game's need no heading.
  const waterGroups = [
    { key: "own", label: null, rows: ownShown },
    { key: "sample", label: ownShown.length > 0 ? t("From the sample week ({n})", { n: sampleShown.length }) : null, rows: sampleShown },
    { key: "game", label: ownShown.length + sampleShown.length > 0 ? t("The game's lake") : null, rows: gameShown },
  ].filter((group) => group.rows.length > 0);
  const elsewhere = needle && shownRows.length === 0 && shownKind !== "all" && rows.some(byName);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          {/* In Polish both words are "Łowiska": the eyebrow names the log instead, so the head doesn't say it twice. */}
          <p className="eyebrow">{t("Waters|page eyebrow")}</p>
          <h1>{t("Spots")}</h1>
          <p className="lede">{t("The places you actually go back to, and the day they fish well.")}</p>
          {/* The season's waters, and how many of them are new this year: trying new water is a season's goal too. */}
          {season.fished > 0 ? (
            <p className="meta season-waters">
              {`${today.slice(0, 4)}: ${tn(season.fished, "{n} water fished", "{n} waters fished")}`}
              {season.first > 0 ? `, ${tn(season.first, "{n} new|waters", "{n} new|waters")}` : ""}
            </p>
          ) : null}
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
            {types.length > 1 ? (
              <ChoiceRow<WaterType | "all">
                wrap
                label={t("Kind of water")}
                value={shownKind}
                // How many of each, the game's lake left out as the list leaves it out under a kind.
                options={[
                  { id: "all", label: t("All waters") },
                  ...types.map((type) => ({ id: type, label: `${t(WATER_LABELS[type])} (${rows.filter((row) => row.spot.id !== PLAY_LAKE_ID && row.spot.waterType === type).length})` })),
                ]}
                onChange={setKind}
              />
            ) : null}
          </div>
        ) : null}
        {finding ? (
          <div className="catch-search spot-find">
            <label htmlFor="spot-find">{t("Find a water")}</label>
            <input id="spot-find" type="search" value={query} autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
            <div role="status">
              {elsewhere ? (
                <p className="empty">
                  {t("No water of this kind called “{query}”.", { query: query.trim() })}{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setKind("all");
                      // The button goes with the message: on to the box, where the new count is heard.
                      requestAnimationFrame(() => document.getElementById("spot-find")?.focus());
                    }}
                  >
                    {t("Show all kinds")}
                  </button>
                </p>
              ) : needle && shownRows.length === 0 ? (
                <p className="empty">{t("No water called “{query}”.", { query: query.trim() })}</p>
              ) : needle ? (
                // Heard as the list narrows: how many waters the name finds.
                <p className="sr-only">{tn(shownRows.length, "{n} water", "{n} waters")}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        {/* The angler's own waters, then the sample week's untouched ones and the game's lake, each said, so Home's count
            of waters is visibly the cards above them. */}
        {waterGroups.map((group) => (
          <Fragment key={group.key}>
            {group.label ? <p className="meta waters-group">{group.label}</p> : null}
            <div className="card-grid">
              {group.rows.map((row) => (
                <SpotCard
                  key={row.spot.id}
                  spot={row.spot}
                  fishCount={shownCount(row)}
                  tripCount={fishedHere(row.spot.id)}
                  lastFishDay={shownLastFish(row)}
                  // Under any order once it has rested a week, as the Map says it: a water left alone is worth a look.
                  restDays={lastOut.has(row.spot.id) && (order === "rested" || daysBetween(lastOut.get(row.spot.id)!, today) >= 7) ? restOf(row.spot.id) : null}
                  nextOuting={nextOutingLine(upcoming.find((trip) => trip.spotId === row.spot.id), today, tomorrow)}
                  // The angler's own fish where the card counts theirs; the game's lake and an untouched sample water what they have.
                  bestLure={bestLureAt(ownHere(row.spot.id) ? countedCatches : book.catches, row.spot.id)}
                  bests={bestsAt(ownHere(row.spot.id) ? countedCatches : book.catches, row.spot.id)}
                  waterTemp={recentTemp(ownHere(row.spot.id) ? countedCatches : book.catches, row.spot.id, today, (entry) => bookFishDay(book, entry))}
                  kindName={kindName}
                  lureName={lureName}
                  outNow={outNowName(row.spot.id)}
                />
              ))}
            </div>
          </Fragment>
        ))}
        {/* The angler's own waters as listed, to paste into a message: which water to fish, and how each has gone. */}
        {ownShown.length > 1 ? (
          <CopySummary
            text={() => watersSummary(ownShown.map((row) => ({ spot: row.spot, fish: shownCount(row), outings: fishedHere(row.spot.id), lastFishDay: shownLastFish(row) })))}
            file="stillwater-waters.txt"
          />
        ) : null}
        {/* Every water with a place in one file, for a new GPS or sounder: the sample week's only while there are no others. */}
        {placed.length > 1 ? (
          <p className="fish-csv">
            <button type="button" className="text-button" onClick={() => downloadFile(gpxFor(placed), "application/gpx+xml", datedName("stillwater-waters.gpx"))}>
              {t("Save all waters for a GPS (.gpx)")}
            </button>
          </p>
        ) : null}
        </>
      )}
    </div>
  );
}

export function SpotPage() {
  const { spotId = "" } = useParams();
  // Keyed by the water, so a merge that lands on the kept water's page starts it fresh.
  return <SpotView key={spotId} />;
}

function SpotView() {
  const { book: whole, deleteSpot } = useLogbook();
  // The sample week's blank plans stay out beside a water of the angler's own, as Trips and Waters leave them out.
  const book = withoutSamplePlans(whole);
  useT();
  const navigate = useNavigate();
  const location = useLocation();
  // Sent from an outing's "Every outing on this water": to the list, after the page's own scroll to the top has run.
  const toOutings = location.hash === "#outings";
  useEffect(() => {
    if (!toOutings) return;
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById("outings");
      heading?.scrollIntoView({ block: "start" });
      heading?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [toOutings]);
  const { spotId = "" } = useParams();
  const spot = spotById(book, spotId);
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const [largest, setLargest] = useLargestOrder();

  if (!spot) {
    // Merged into another water (an old link, a bookmark): say where its outings and fish went.
    // Followed as far as a water still in the book: one merged twice names where its fish are now.
    const into = spotById(book, mergedInto(readMergedWaters(), spotId, (id) => Boolean(spotById(book, id))) ?? "");
    return (
      <div className="sheet">
        <h1>{t("Missing water")}</h1>
        {into ? (
          <>
            <p className="lede">{plainName(into.name) ? t("This water was merged into {name}.", { name: plainName(into.name) }) : t("This water was merged into a water with no name.")}</p>
            <p className="lone-link">
              <Link to={`/spots/${into.id}`}>{t("Open {name}", { name: waterName(into.name) })}</Link>
            </p>
          </>
        ) : (
          <p className="lede">{t("That spot is not in this book.")}</p>
        )}
        <Link to="/spots">{t("Back to spots")}</Link>
      </div>
    );
  }

  const trips = tripsForSpot(book, spot.id);
  const storedTrips = tripsForSpot(whole, spot.id).length;
  const catches = catchesForSpot(book, spot.id);
  // An untitled outing goes by this water's name, which the page already says: its link reads as the day's outing.
  const outingHere = (tripId: string) => {
    const name = outingNameById(book, tripId);
    return name && name === plainName(spot.name) ? t("That day's outing") : name;
  };
  const fishByTrip = fishCountsByTrip({ ...book, catches });
  // A sample water the angler has fished too: every count here is their own fish and outings, as Bests counts them,
  // not the sample week's invented ones beside them. The game's lake counts its own.
  // Decided once for the water, fish and outings alike: a sample water with nothing of the angler's on it keeps what it
  // has, as its card on Waters does, so the page and its copy never count its fish without its outing.
  const ownBook = countedBook(book);
  const keepsAll =
    spot.id === PLAY_LAKE_ID || (isSampleSpot(spot.id) && !ownBook.catches.some((entry) => entry.spotId === spot.id) && !ownBook.trips.some((trip) => trip.spotId === spot.id));
  const counted = keepsAll ? book : ownBook;
  const ownIds = new Set(counted.catches.map((entry) => entry.id));
  const summed = keepsAll ? catches : catches.filter((entry) => ownIds.has(entry.id));
  // The outings as the fish are counted: the sample week's left out once the book has the angler's own.
  const countedTrips = keepsAll ? trips : counted.trips.filter((trip) => trip.spotId === spot.id);
  const countedTripIds = new Set(countedTrips.map((trip) => trip.id));
  const hooks = hookTally(counted, spot.id);
  // Last evening's outing, still going in the small hours, is no finished blank yet, as Trips and Home take it.
  const fishedBy = outingDay(today);
  const { fishOn, looseByDay } = outingFishHere(book, fishByTrip, summed, countedTrips);
  // The best outing among the angler's own here, as an outing's page names it.
  const top = topOuting(countedTrips, fishOn, fishedBy, book);
  // A blank spell still running here, once the water has given a fish: whether to try elsewhere.
  const average = outingAverage(countedTrips, fishOn, fishedBy, book);
  const streak = outingStreak(countedTrips, fishOn, fishedBy, looseByDay.keys(), book);
  const split = weekendSplit(countedTrips, fishOn, fishedBy, book);
  // Last year's kinds here still to come back, and the day this water gave the most kinds: as Bests says them for the book.
  // Dated as the season line above dates them, so a New Year's Eve night fish is last year's on both.
  const notYet = notYetThisYear(summed, new Date(`${fishedBy}T12:00:00`), undefined, (entry) => bookFishDay(book, entry));
  const kindsDay = mostKindsDay({ ...book, catches: summed });
  // Its links open the fish its counts count: the sample week's beside the angler's own left out, as here.
  // Kinds named as the book writes them most, as Bests and the catch cards name them, not as this water's few fish do.
  const kindName = bookKindName(book.catches);
  const lureName = bookLureName(book.catches);
  const here = summed.length < catches.length ? `${exactTerm("water", plainName(spot.name))} -${t("sample|search word")}` : exactTerm("water", plainName(spot.name));
  // A search finds a water by its name, so while others share it, this page's links open their fish too. A water with
  // no name is no one's twin.
  const twins = foldName(spot.name) ? book.spots.filter((other) => other.id !== spot.id && twinName(other.name, spot.name)) : [];
  const twin = twins[0];
  // The kinds no other water in the book has given, its twins aside as its links take them: where to come back for
  // them. Said once another water has a fish, or every kind would be this water's alone; not for the game's lake, nor
  // for an untouched sample water beside the angler's own fish, whose made-up fish say nothing of theirs.
  const sameName = new Set([spot.id, ...twins.map((other) => other.id)]);
  const inBook = new Set(book.spots.map((other) => other.id));
  const elsewhere = counted.catches.filter((entry) => entry.spotId !== PLAY_LAKE_ID && inBook.has(entry.spotId) && !sameName.has(entry.spotId));
  const elsewhereKinds = new Set(elsewhere.map((entry) => kindKey(entry.species)));
  const onlyHere =
    spot.id === PLAY_LAKE_ID || (keepsAll && hasOwnEntries(book)) || elsewhere.length === 0
      ? []
      : speciesCounts(summed).map((row) => row.species).filter((species) => !elsewhereKinds.has(kindKey(species)));
  const lastHere = spot.id === PLAY_LAKE_ID ? undefined : lastOutByWater(counted, fishedBy).get(spot.id);
  // The outing on this water now, as the Map says it: of a dawn and a dusk, the later.
  const outNowHere = outNowAt(book, spot.id);
  // The next outing planned here, as the Waters card names it; today's once it has a fish is under way, not ahead.
  const nextHere = nextRealTrips(book, today).find((trip) => trip.spotId === spot.id);
  const restHere = lastHere ? daysBetween(lastHere, today) : 0;
  // The nearest of the angler's other pinned waters, as the Map says it: which water to try next door. A sample water
  // has a place only once the angler pins it.
  const neighbour = spot.place && spot.id !== PLAY_LAKE_ID ? nearestPinned(spot.place, book.spots.filter((other) => other.id !== spot.id && other.id !== PLAY_LAKE_ID)) : null;
  // Its first fish and its last, by the days they count on: the first said once a later fish day has followed it.
  const fishDays = spot.id === PLAY_LAKE_ID ? [] : summed.map((entry) => bookFishDay(book, entry)).filter((day) => day <= today).sort();
  const firstHere = fishDays[0] !== fishDays.at(-1) ? fishDays[0] : undefined;
  // For the copied summary: the day it was last fished and what that day's outing gave, the first thing a mate asks.
  // Of a dawn and a dusk, the later, as Out now takes it.
  const lastHereTrip = lastHere ? countedTrips.filter((trip) => trip.date === lastHere).sort(newestOutingFirst(book))[0] : undefined;
  // Its loose fish that day, as fishOn adds them: the angler's own, when it was the day's one outing here.
  const lastHereLoose = lastHereTrip && countedTrips.filter((trip) => trip.date === lastHereTrip.date).length === 1 ? summed.filter((entry) => !entry.tripId && bookFishDay(book, entry) === lastHereTrip.date) : [];
  const lastHereText = lastHere ? t("Last fished here: {day}", { day: lastHereTrip ? `${formatDay(lastHere)} · ${tn(fishOn(lastHereTrip.id), "{n} fish", "{n} fish")}` : formatDay(lastHere) }) : null;
  // By the day a fish counts on, as the year search each bar opens reads it.
  const years = yearTally(summed, (entry) => bookFishDay(book, entry));
  // This season here against last season up to the same date, once last season had begun by now. Outings counted as
  // the average counts them.
  const ownHere = summed;
  const seasonSoFar = (year: string) => ({
    outings: countedTrips.filter((trip) => trip.date.startsWith(`${year}-`) && trip.date.slice(5) <= today.slice(5) && outingCounted(book, trip, fishedBy, fishOn(trip.id))).length,
    fish: ownHere.filter((entry) => {
      // A night's small-hours fish counts on its outing's day, as Bests and the day search put it.
      const day = bookFishDay(book, entry);
      return day.startsWith(`${year}-`) && day.slice(5) <= today.slice(5);
    }).length,
  });
  const thisSeason = seasonSoFar(today.slice(0, 4));
  const lastSeason = seasonSoFar(String(Number(today.slice(0, 4)) - 1));
  // The outings already fished, as the average counts them: a planned one has nothing to tell yet.
  const notes = spot.id === PLAY_LAKE_ID ? [] : notesHere(countedTrips, fishedBy, 3, fishOn);
  // As the Waters card and Trips count them: a fish lost or a strike missed makes today's an outing fished too.
  const fishedOutings = countedTrips.filter((trip) => outingCounted(book, trip, fishedBy, fishOn(trip.id))).length;

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/spots/${spot.id}/edit`}
        ask={
          // How much goes with it, since a water with a season on it takes a lot: the sample week's blank plans too.
          storedTrips + catches.length === 0
            ? t("Delete this water?")
            : storedTrips > 0 && catches.length > 0
              ? t("Delete this water? Its {outings} and {fish} leave the book too.", { outings: tn(storedTrips, "{n} outing", "{n} outings"), fish: tn(catches.length, "{n} fish", "{n} fish") })
              : // Only outings or only fish: "and Nothing logged" would read mid-sentence.
                t("Delete this water? Also leaving the book: {what}.", { what: storedTrips > 0 ? tn(storedTrips, "{n} outing", "{n} outings") : tn(catches.length, "{n} fish", "{n} fish") })
        }
        onDelete={() => {
          if (deleteSpot(spot.id)) leaveDeleted(navigate, location.state, "/spots");
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
        <h1>{waterName(spot.name)}</h1>
        <span className={`stamp stamp-${spot.waterType}`}>{t(WATER_LABELS[spot.waterType])}</span>
        {twin ? (
          <p className="meta twin-note">
            {/* The other waters' spellings, which the angler may not know about: "Śniardwy" beside "Sniardwy". */}
            {twins.length > 1
              ? twins.every((other) => plainName(other.name) === plainName(spot.name))
                ? t("Other waters are also called {name}, so the links on this page open the fish of all of them.", { name: plainName(spot.name) })
                : t("Other waters have the same or nearly the same name ({names}), so the links on this page open the fish of all of them.", { names: [...new Set(twins.map((other) => plainName(other.name)))].join(", ") })
              : plainName(twin.name) === plainName(spot.name)
                ? t("Another water is also called {name}, so the links on this page open the fish of both.", { name: plainName(spot.name) })
                : t("Another water has nearly the same name, {name}, so the links on this page open the fish of both.", { name: plainName(twin.name) })}{" "}
            {spot.id === PLAY_LAKE_ID || twin.id === PLAY_LAKE_ID || isSampleSpot(spot.id) || isSampleSpot(twin.id) ? (
              // The game's lake keeps its name: the other one is the one to rename.
              <Link to={`/spots/${spot.id === PLAY_LAKE_ID ? twin.id : spot.id}/edit`} state={spot.id === PLAY_LAKE_ID ? undefined : editFromPage(location.state)}>
                {t("Rename one")}
              </Link>
            ) : (
              <>
                <Link to={`/spots/${spot.id}?${MERGE_PARAM}=${encodeURIComponent(twin.id)}`} replace>
                  {t("Merge them")}
                </Link>
                {" · "}
                <Link to={`/spots/${spot.id}/edit`} state={editFromPage(location.state)}>
                  {t("Rename this one")}
                </Link>
              </>
            )}
          </p>
        ) : null}
        {/* When it was last fished, by its last outing or fish: how long it has rested. */}
        {lastHere ? (
          <p className="meta last-here">
            {/* Last evening's outing still going in the small hours is today's, as Out now below says it. */}
            <LastHereLine rest={outNowHere?.date === lastHere ? 0 : restHere} day={lastHere} trip={lastHereTrip} fish={fishOn} catches={catches} loose={lastHereLoose} lureName={lureName} />
          </p>
        ) : null}
        {/* How long the angler has known this water: its first fish, once another fish day has followed it. */}
        {firstHere ? <p className="meta first-here">{t("First fish here: {day}", { day: formatDay(firstHere) })}</p> : null}
        {outNowHere ? (
          <p className="meta out-now">
            <Link to={`/trips/${outNowHere.id}`}>{t("Out now: {outing}", { outing: outingName(outNowHere, book.spots) })}</Link>
          </p>
        ) : null}
        {nextHere ? (
          <p className="meta next-here">
            <Link to={`/trips/${nextHere.id}`}>{t("Next outing here: {when}", { when: tripWhen(nextHere.date, today, tomorrow) })}</Link>
          </p>
        ) : null}
        {spot.place ? (
          <p className="meta spot-place">
            {formatCoord(spot.place.lat, spot.place.lng)}{" "}
            <MapAnchor lat={spot.place.lat} lng={spot.place.lng}>
              {t("Open on a map")}
            </MapAnchor>
            {/* Among the angler's other waters, on the Map page's own sheet. */}
            {"\u00a0· "}
            <Link to={`/map#water-${spot.id}`}>{t("See it on the Map")}</Link>
            {/* To paste into a sounder, a message or the car's navigation: the numbers above are fiddly to select on a phone. */}
            {"\u00a0· "}
            <CopyPlace lat={spot.place.lat} lng={spot.place.lng} />
            {/* The drive there before dawn, from wherever the angler is. */}
            {"\u00a0· "}
            <a href={`https://www.openstreetmap.org/directions?route=%3B${spot.place.lat}%2C${spot.place.lng}`} target="_blank" rel="noreferrer">
              {t("Directions")}
              <span className="sr-only"> {t("(opens OpenStreetMap in a new tab)")}</span>
            </a>
            {/* A waypoint a GPS, sounder or phone's navigation app imports, rather than numbers copied one by one. */}
            {"\u00a0· "}
            <button type="button" className="text-button" onClick={() => downloadFile(gpxFor([spot]), "application/gpx+xml", `${fileSlug(spot.name)}.gpx`)}>
              {t("Save for a GPS (.gpx)")}
            </button>
          </p>
        ) : null}
        {/* When the light comes and goes there: the page counts the fish that came within an hour of either. */}
        {spot.place ? <SunAtWater place={spot.place} /> : null}
        {neighbour ? (
          <p className="meta nearest-water">
            {t("Nearest water:")} <Link to={`/spots/${neighbour.spot.id}`}>{t("{distance} from {water}", { distance: distanceText(neighbour.km, getUnits()), water: waterName(neighbour.spot.name) })}</Link>
          </p>
        ) : null}
        {spot.place ? null : placeFor(spot.id) ? (
          // A sample water has its pin on the sample sheet: its row there, as an own water's place leads to its own.
          <p className="meta spot-place">
            <Link to={`/map#water-${spot.id}`}>{t("See it on the Map")}</Link>
          </p>
        ) : spot.id === PLAY_LAKE_ID ? null : (
          // A sample water already has its pin on the map; any other water with no place is offered one.
          <p className="meta spot-place">
            {/* Opened from this page as its Edit is, so Save goes back to it rather than stacking a second copy. */}
            <Link to={`/spots/${spot.id}/edit#place`} state={editFromPage(location.state)}>
              {t("Note where it is")}
            </Link>
          </p>
        )}
      </EditDelete>
      {spot.notes ? <p className="prose">{spot.notes}</p> : null}
      <aside className="conditions" aria-label={t("Best conditions")}>
        <span className="eyebrow">{t("Best conditions")}</span>
        <p>{spot.bestConditions || t("Not noted yet.")}</p>
      </aside>
      <WaterTipsBox catches={summed} on={today} within={here} place={spot.place ?? placeFor(spot.id)} />
      <TempThroughYear catches={summed} />
      {/* A water fished only blank has something to send too: "skip this one". */}
      {summed.length > 0 || fishedOutings > 0 ? (
        <CopySummary
          text={() =>
            spotSummary(spot, fishedOutings, summed, average, top ? { trip: top, fish: fishOn(top.id) } : null, lastHereText, {
              hooks: hooks ? hookText(hooks) : null,
              next: nextHere ? t("Next outing here: {when}", { when: tripWhen(nextHere.date, today, tomorrow) }) : null,
              lureName,
            })
          }
          file="stillwater-water.txt"
        />
      ) : null}

      <div className="section-head">
        <h2 id="outings" tabIndex={-1}>
          {t("Outings")}
        </h2>
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
      {streak.dryNow > 1 && streak.best > 0 ? <p className="meta dry-here">{t("Outings here since the last fish: {count}", { count: streak.dryNow })}</p> : null}
      {top ? (
        <p className="meta stand">
          {/* The best day here, opening that outing. */}
          {t("Best outing here:")} <Link to={`/trips/${top.id}`}>{`${outingName(top, book.spots)} · ${tripWhen(top.date, today, tomorrow, outNow(book, top))}`}</Link>, {fishCountLabel(fishOn(top.id))}
        </p>
      ) : null}
      {/* What the angler wrote after recent days here, each opening its outing. */}
      {notes.length > 0 ? (
        <div className="notes-here">
          <p className="meta">{t("From your outing notes here:")}</p>
          <ul className="species-waters">
            {notes.map(({ trip, text }) => (
              <li key={trip.id}>
                <span>
                  <Link to={`/trips/${trip.id}`}>{formatDay(trip.date)}</Link>: {t("“{query}”", { query: text })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {trips.length === 0 ? (
        <p className="empty">{t("No outings on this water yet.")}</p>
      ) : (
        <PagedTrips trips={[...trips].sort(newestOutingFirst(book))} fishOn={fishOn} counted={keepsAll ? undefined : (trip) => countedTripIds.has(trip.id)} stack>
          {(trip) => (
            <TripCard
              level={4}
              key={trip.id}
              trip={trip}
              spotName={null}
              waterType={null}
              fishCount={fishOn(trip.id)}
              today={today}
              tomorrow={tomorrow}
            />
          )}
        </PagedTrips>
      )}

      <div className="section-head">
        <h2>{t("Fish from this water")}</h2>
      </div>
      <FishSum catches={summed} list={`water:${spot.id}`} kindName={kindName} />
      {summed.length < catches.length ? (
        <p className="meta">{tn(catches.length - summed.length, "Also listed: {n} fish from the sample week or the game.", "Also listed: {n} fish from the sample week or the game.")}</p>
      ) : null}
      <SpeciesChips catches={summed} within={here} kindName={kindName} />
      {notYet.length > 0 ? (
        <p className="meta not-yet">
          <span>
            {t("Not yet this year:")} <KindLinks names={notYet} within={here} kindName={kindName} />
          </span>
        </p>
      ) : null}
      {onlyHere.length > 0 ? (
        <p className="meta only-here">
          <span>
            {t("Only from this water:")} <KindLinks names={onlyHere} within={here} kindName={kindName} />
          </span>
        </p>
      ) : null}
      {kindsDay ? (
        <p className="meta most-kinds">
          <Link to={findWithLink(here, kindsDay.date)}>{t("Most kinds in one day: {count}, on {day}", { count: kindsDay.kinds, day: formatDay(kindsDay.date) })}</Link>
        </p>
      ) : null}
      {/* The game's lake and a sample water beside the angler's own: a kind's page holds other fish, so the kind opens this water's. */}
      <BiggestHere
        kindName={kindName}
        catches={summed}
        spotId={spot.id}
        kindLink={(species) => (kindOnPage(book, species).some((entry) => entry.spotId === spot.id) ? speciesLink(species) : findWithLink(here, exactTerm("species", kindName(species))))}
      />
      {/* Every photo it shows, the sample week's too, so its count opens them all. */}
      <PhotoStrip catches={catches} within={exactTerm("water", plainName(spot.name))} named list={`water:${spot.id}`} />
      <FishCsv catches={catches} name={spot.name} />
      {summed.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("When it bites")}</h2>
          </div>
          <TallyBars key={spot.id} rows={biteTimes({ ...book, catches: summed }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(here, exactTerm("time", t(row.label))) : undefined }))} />
        </>
      ) : null}
      <MonthBars catches={summed} within={here} monthOf={(entry) => bookFishDay(book, entry).slice(0, 7)} />
      {/* Each season's fish here, newest first: whether the water is holding up or fading. */}
      {years.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By year")}</h2>
          </div>
          <TallyBars key={`years-${spot.id}`} rows={years.map((row) => ({ key: row.year, label: row.year, count: row.count, to: findWithLink(here, row.year) }))} />
        </>
      ) : null}
      {catches.length === 0 ? (
        <p className="empty">{t("Nothing logged here yet.")}</p>
      ) : (
        <>
          {/* "Which was my biggest here": the same fish, largest first. */}
          {catches.length > 1 ? <MatchOrder largest={largest} onChange={setLargest} /> : null}
          <PagedCatches key={String(largest)} items={largest ? largestFirst(catches) : catches} monthOf={largest ? undefined : (entry) => bookFishDay(book, entry).slice(0, 7)}>
            {(entry) => (
              <CatchCard
                // Under the month headings (h3) newest first; largest first has none, so straight under the h2.
                level={largest ? 3 : 4}
                key={entry.id}
                entry={entry}
                spotName={null}
                tripTitle={entry.tripId ? outingHere(entry.tripId) : null}
                list={`water${largest ? "-largest" : ""}:${spot.id}`}
              />
            )}
          </PagedCatches>
        </>
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
  const location = useLocation();
  const { spotId } = useParams();
  const existing = spotId ? spotById(book, spotId) : undefined;
  // Sent here to note where the water is (from the map, or its page): straight to the place field.
  const toPlace = useLocation().hash === "#place";
  // Sent from the catch or outing form of a book with no water yet: back there with the new water once it is saved.
  const [params] = useSearchParams();
  // Sent from the map to note a place: back to the map, where the new pin shows.
  const then = existing ? (params.get("then") === "map" ? "map" : null) : params.get("then");
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
  const [locating, setLocating] = useState<"idle" | "busy" | "found" | "failed" | "linked">("idle");
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [error, setError] = useState("");
  // Unsaved changes to a water in the book wait for the next visit to its form.
  // A new water's notes too, unless it is being added on the way to a catch or outing, whose own draft holds them.
  const kept = useKeptForm(
    existing ? `spot:${existing.id}` : then ? null : "spot:new",
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
  // The angler's own water first: the game's lake is also called Stillwater, and can't be picked for a fish or outing.
  const twins = name.trim() ? book.spots.filter((spot) => spot.id !== existing?.id && twinName(spot.name, name)) : [];
  const sameName = twins.find((spot) => spot.id !== PLAY_LAKE_ID);
  const gameNamed = !sameName && twins.length > 0;

  // Back to the catch or outing form this water was added for, with it picked.
  const backToForm = (spotId: string) => {
    const form = then === "catch" ? "/catches/new" : "/trips/new";
    if (then === "catch") {
      const typed = readKeptDraft();
      if (typed) keepDraft({ ...typed, spotId, tripId: "" });
    }
    noteAddedWater(spotId);
    if (canGoBack() && pageBefore()?.split("?")[0] === form) navigate(-1);
    else navigate(`${form}?spot=${spotId}`, { replace: true });
  };

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
    // Back to the form it was added for, which picks the new water (and a fish typed there comes back on it); a form
    // opened directly gives way to a fresh one on the water, so Back doesn't open it again.
    if (then === "catch" || then === "trip") backToForm(result.id);
    // Back to the map it was opened from, rather than a second map on top of the first; a form opened directly takes its place.
    // Said there as on the water's page, so a save with no place noted (no pin moves) still shows it went through.
    else if (then === "map") {
      const kind = existing ? "catchEdit" : "spot";
      if (canGoBack()) {
        sayAfterBack(kind);
        navigate(-1);
      } else navigate("/map", { replace: true, ...savedState(kind) });
    }
    else if (existing) leaveSaved(navigate, location.state, `/spots/${result.id}`);
    else navigate(`/spots/${result.id}`, { replace: true });
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
          <h1 data-title={existing ? t("Editing {name}", { name: waterName(existing.name) }) : undefined}>{existing ? waterName(existing.name) : t("Add a spot")}</h1>
        </div>
        <Link
          to={then === "map" ? "/map" : existing ? `/spots/${existing.id}` : "/spots"}
          onClick={(event) => {
            kept.drop();
            // Back where the form was opened from (the map, the water, Waters): Back from there then doesn't reopen this form.
            if (canGoBack()) {
              event.preventDefault();
              navigate(-1);
            }
          }}
        >
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
              {t("This book already has a water by that name:")}{" "}
              {/* Added for a fish or an outing: the one already here is picked for it, rather than leaving the form. */}
              {!existing && (then === "catch" || then === "trip") ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    kept.drop();
                    backToForm(sameName.id);
                  }}
                >
                  {t("Use {name}", { name: plainName(sameName.name) })}
                </button>
              ) : (
                <Link to={`/spots/${sameName.id}`}>{plainName(sameName.name)}</Link>
              )}
            </p>
          ) : gameNamed ? (
            <p className="wide form-note" role="status">
              {t("The game's lake is called that too; your water is kept apart from it.")}
            </p>
          ) : null}
          {/* The choice row is the group and carries the name, so the type isn't announced twice. */}
          <fieldset role="presentation">
            <legend aria-hidden="true">{t("Water type")}</legend>
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
              aria-describedby="place-link-hint"
              onChange={(event) => {
                setPlace(event.target.value);
                setLocating("idle");
              }}
              // A map link pasted whole, or a place card's degrees and minutes, turns into plain numbers, so what is saved
              // is what the field shows.
              onBlur={() => {
                if (!/^\s*(https?:|geo:)|°/i.test(place)) return;
                const pin = parseSpotPlace(place);
                if (pin) {
                  setPlace(`${pin.lat}, ${pin.lng}`);
                  if (/^\s*(https?:|geo:)/i.test(place)) setLocating("linked");
                }
              }}
              // An example place near the reader: a north-woods lake in English, a Masurian one in Polish.
              placeholder={t("46.85, -94.24")}
            />
          </label>
          {/* Outside the label, so the field keeps its own name. */}
          <p className="wide form-note" id="place-link-hint" role="status">
            {locating === "linked" ? t("Place read from the map link.") : t("A link copied from a map app works too.")}
          </p>
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

/** "Today: sunrise 6:58 · sunset 17:40" at the water, in this device's clock; tomorrow's once today's sun has set. */
function SunAtWater({ place }: { place: { lat: number; lng: number } }) {
  const now = new Date();
  // A water hours of clock away: this device's times would put its sunset before its sunrise.
  if (Math.abs(place.lng / 15 + now.getTimezoneOffset() / 60) > 3) return null;
  const today = localDate(now);
  const sunToday = sunTimes(today, place.lat, place.lng);
  const afterDark = "rise" in sunToday && now > sunToday.set;
  const day = afterDark ? shiftDate(now, 1) : today;
  const sun = afterDark ? sunTimes(day, place.lat, place.lng) : sunToday;
  if (!("rise" in sun)) return null;
  const times = { rise: formatTimeOfDay(sun.rise.toISOString()), set: formatTimeOfDay(sun.set.toISOString()) };
  return <p className="meta sun-line">{afterDark ? t("Tomorrow: sunrise {rise} · sunset {set}", times) : t("Today: sunrise {rise} · sunset {set}", times)}</p>;
}

/** "Water temperature in 2026: Apr 20 52°F → Jun 3 64°F → Sep 9 58°F", from the readings noted with fish. */
/** "Last fished here 8 days ago · Sat, Oct 10 · 2 fish · Spinner ×1": that day's outing, with what it gave and on what. */
/** Kinds in readers' order, each opening its fish within `within`: "Tench, Zander". */
function KindLinks({ names, within, kindName }: { names: readonly string[]; within: string; kindName: (name: string) => string }) {
  return inReadersOrder(names, kindName).map((name, index) => (
    <Fragment key={name}>
      {index > 0 ? ", " : null}
      <Link to={findWithLink(within, exactTerm("species", kindName(name)))}>{kindName(name)}</Link>
    </Fragment>
  ));
}

function LastHereLine({
  rest,
  day,
  trip,
  fish,
  catches,
  loose,
  lureName,
}: {
  rest: number;
  day: string;
  trip: Trip | undefined;
  fish: (tripId: string) => number;
  catches: readonly CatchEntry[];
  /** The fish logged loose here that day, when the count beside it holds them: the day's one outing here. */
  loose: readonly CatchEntry[];
  lureName: (lure: string) => string;
}) {
  const when = rest === 0 ? t("Fished here today") : rest === 1 ? t("Last fished here yesterday") : `${tn(rest, "Last fished here {n} day ago", "Last fished here {n} days ago")} · ${formatDay(day)}`;
  // A day fished off any outing (fish logged loose) has no page to open: the line stays as it was.
  if (!trip) return <>{when}</>;
  const caught = fish(trip.id);
  // The lure that took most that day here, once it clearly led: one of a tie, or one fish each, says nothing. This
  // water's fish only, as the count beside it: an outing that moved on to another water doesn't lend it its lures.
  const [lure, next] = pieceTally([...catches.filter((entry) => entry.tripId === trip.id), ...loose], 2);
  const led = lure && lure.count > 1 && (!next || next.count < lure.count) ? lure : null;
  return (
    <Link to={`/trips/${trip.id}`}>
      {/* A count in a sentence: a blank outing was "0 fish", not "Nothing logged". */}
      {when} · {tn(caught, "{n} fish", "{n} fish")}
      {led ? ` · ${lureName(led.lure)} ×${led.count}` : ""}
    </Link>
  );
}

function TempThroughYear({ catches }: { catches: readonly CatchEntry[] }) {
  useT();
  const { book } = useLogbook();
  // By the day a fish counts on: a New Year's Eve night's small hours read as the old year's last day, not the new one's first.
  const readings = tempThroughYear(catches, (entry) => bookFishDay(book, entry));
  if (readings.length === 0) return null;
  // The month written out, so Polish takes its "of" form ("16 maja"); read at noon, so no time zone moves the day.
  const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(locale(), { month: "long", day: "numeric" });
  return (
    <p className="meta temp-year">
      {t("Water temperature in {year}: {readings}", {
        year: readings[0]!.day.slice(0, 4),
        readings: readings.map((reading) => `${day(reading.day)}: ${tempText(reading.fahrenheit)}`).join(" → "),
      })}
    </p>
  );
}
