import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { MapAnchor } from "./MapAnchor";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  WATER_LABELS,
  WATER_TYPES,
  type WaterType,
  biteTimes,
  catchesForSpot,
  fishCountsByTrip,
  localDate,
  shiftDate,
  spotById,
  tripsForSpot,
  type CatchEntry,
  type Trip,
  parseSpotPlace,
  foldText,
} from "@stillwater/shared";
import { CatchCard, SpotCard, TripCard } from "./cards";
import { PagedCatches } from "./PagedCatches";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { TallyBars } from "./TallyBars";
import { WaterTipsBox } from "./WaterTipsBox";
import { exactTerm, findWithLink } from "./findLinks";
import { kindOnPage, speciesLink } from "./speciesLink";
import { SpeciesChips } from "./SpeciesChips";
import { daysBetween, lastOutByWater, spotsByLastFish } from "./spotOrder";
import { bookFishDay, yearTally } from "./tripMonths";
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
import { countedBook, countedFish } from "./milestones";
import { PhotoStrip } from "./SpeciesPage";
import { formatCoord, placeFor } from "./map/places";
import { hookTally, hookText } from "./hookTally";
import { MonthBars } from "./MonthBars";
import { BiggestHere } from "./BiggestHere";
import { MERGE_PARAM, MergeWater } from "./MergeWater";
import { readMergedWaters } from "./waterMerge";
import { notesHere } from "./outingNotes";
import { largestFirst } from "./largestFirst";
import { MatchOrder, useLargestOrder } from "./MatchOrder";
import { PLAY_LAKE_ID } from "./playLake";
import { isSampleSpot, nextRealTrips } from "./bookCopy";
import { canGoBack, pageBefore } from "./FieldShell";
import { noteAddedWater } from "./addedWater";
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

export function SpotsPage() {
  const { book } = useLogbook();
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
  const ownRows = spotsByLastFish({ ...book, catches: countedFish(book.catches) });
  const ownOrder = new Map(ownRows.map((row, index) => [row.spot.id, index]));
  const ownCount = new Map(ownRows.map((row) => [row.spot.id, row.fishCount]));
  const countOf = (row: { spot: { id: string } }) => ownCount.get(row.spot.id) ?? 0;
  rows.sort((a, b) => (ownOrder.get(a.spot.id) ?? 0) - (ownOrder.get(b.spot.id) ?? 0));
  // The order picked holds while its control shows: a list cut to two waters goes back to the last fish.
  const order: SpotOrder = rows.length > 2 ? storedOrder : "fish";
  const fishOnTrip = fishCountsByTrip(book);
  if (order === "name") rows.sort((a, b) => a.spot.name.localeCompare(b.spot.name, locale()));
  if (order === "most") rows.sort((a, b) => countOf(b) - countOf(a));
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
  const query = finding ? (params.get(WATER_FIND) ?? "") : "";
  const needle = foldText(query.trim()).toLowerCase();
  const setQuery = (next: string) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next.trim()) out.set(WATER_FIND, next);
        else out.delete(WATER_FIND);
        return out;
      },
      { replace: true },
    );
  const shownRows = (shownKind === "all" ? rows : rows.filter((row) => row.spot.id !== PLAY_LAKE_ID && row.spot.waterType === shownKind)).filter(
    (row) => !needle || foldText(row.spot.name).toLowerCase().includes(needle),
  );

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
            <div role="status">{needle && shownRows.length === 0 ? <p className="empty">{t("No water called “{query}”.", { query: query.trim() })}</p> : null}</div>
          </div>
        ) : null}
        <div className="card-grid">
          {shownRows.map((row) => (
            <SpotCard
              key={row.spot.id}
              spot={row.spot}
              fishCount={row.fishCount}
              // Outings fished, as the water's own page counts them: not those still planned, and today's once it has a fish.
              tripCount={tripsForSpot(book, row.spot.id).filter((trip) => trip.date < today || (trip.date === today && (fishOnTrip.get(trip.id) ?? 0) > 0)).length}
              lastFishDay={row.lastFishDay}
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
  const { spotId = "" } = useParams();
  // Keyed by the water, so a merge that lands on the kept water's page starts it fresh.
  return <SpotView key={spotId} />;
}

function SpotView() {
  const { book, deleteSpot } = useLogbook();
  useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { spotId = "" } = useParams();
  const spot = spotById(book, spotId);
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const [largest, setLargest] = useLargestOrder();

  if (!spot) {
    // Merged into another water (an old link, a bookmark): say where its outings and fish went.
    const into = spotById(book, readMergedWaters()[spotId] ?? "");
    return (
      <div className="sheet">
        <h1>{t("Missing water")}</h1>
        {into ? (
          <>
            <p className="lede">{t("This water was merged into {name}.", { name: into.name })}</p>
            <p>
              <Link to={`/spots/${into.id}`}>{t("Open {name}", { name: into.name })}</Link>
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
  const catches = catchesForSpot(book, spot.id);
  // An untitled outing goes by this water's name, which the page already says: its link reads as the day's outing.
  const outingHere = (tripId: string) => {
    const name = outingNameById(book, tripId);
    return name === spot.name ? t("That day's outing") : name;
  };
  const fishByTrip = fishCountsByTrip({ ...book, catches });
  const hooks = hookTally(book, spot.id);
  const average = outingAverage(trips, (id) => fishByTrip.get(id) ?? 0, today);
  // The best outing among the angler's own here, as an outing's page names it.
  const top = topOuting(spot.id === PLAY_LAKE_ID ? trips : countedBook(book).trips.filter((trip) => trip.spotId === spot.id), (id) => fishByTrip.get(id) ?? 0, today);
  // A blank spell still running here, once the water has given a fish: whether to try elsewhere.
  // A fish here logged off its outing still ends a dry run: counted on the day it came.
  const looseByDay = new Map<string, number>();
  for (const entry of catches) if (!entry.tripId) looseByDay.set(localDate(new Date(entry.caughtAt)), (looseByDay.get(localDate(new Date(entry.caughtAt))) ?? 0) + 1);
  const dayOf = new Map(trips.map((trip) => [trip.id, trip.date]));
  const streak = outingStreak(trips, (id) => (fishByTrip.get(id) ?? 0) + (looseByDay.get(dayOf.get(id) ?? "") ?? 0), today, looseByDay.keys());
  const split = weekendSplit(trips, (id) => fishByTrip.get(id) ?? 0, today);
  // Last year's kinds here still to come back, and the day this water gave the most kinds: as Bests says them for the book.
  // Dated as the season line above dates them, so a New Year's Eve night fish is last year's on both.
  const notYet = notYetThisYear(catches, new Date(), undefined, (entry) => bookFishDay(book, entry));
  const kindsDay = mostKindsDay({ ...book, catches });
  const here = exactTerm("water", spot.name);
  // A search finds a water by its name, so while another shares it, this page's links open both waters' fish.
  const twin = book.spots.find((other) => other.id !== spot.id && other.name.trim().toLowerCase() === spot.name.trim().toLowerCase());
  const lastHere = spot.id === PLAY_LAKE_ID ? undefined : lastOutByWater(book, today).get(spot.id);
  // The next outing planned here, as the Waters card names it; today's once it has a fish is under way, not ahead.
  const nextHere = nextRealTrips(book, today).find((trip) => trip.spotId === spot.id);
  const restHere = lastHere ? daysBetween(lastHere, today) : 0;
  // By the day a fish counts on, as the year search each bar opens reads it.
  const years = yearTally(catches, (entry) => bookFishDay(book, entry));
  // This season here against last season up to the same date, once last season had begun by now. Today's outing
  // counts once it has a fish, as the average counts outings.
  const ownHere = countedFish(catches);
  // The outings as the fish are counted: the sample week's left out once the book has the angler's own.
  const countedTrips = countedBook(book).trips.filter((trip) => trip.spotId === spot.id);
  const seasonSoFar = (year: string) => ({
    outings: countedTrips.filter((trip) => trip.date.startsWith(`${year}-`) && trip.date.slice(5) <= today.slice(5) && (trip.date < today || (fishByTrip.get(trip.id) ?? 0) > 0)).length,
    fish: ownHere.filter((entry) => {
      // A night's small-hours fish counts on its outing's day, as Bests and the day search put it.
      const day = bookFishDay(book, entry);
      return day.startsWith(`${year}-`) && day.slice(5) <= today.slice(5);
    }).length,
  });
  const thisSeason = seasonSoFar(today.slice(0, 4));
  const lastSeason = seasonSoFar(String(Number(today.slice(0, 4)) - 1));
  // The outings already fished, as the average counts them: a planned one has nothing to tell yet.
  const notes = spot.id === PLAY_LAKE_ID ? [] : notesHere(countedTrips, today, 3, (id) => fishByTrip.get(id) ?? 0);
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
        <h1>{spot.name}</h1>
        <span className={`stamp stamp-${spot.waterType}`}>{t(WATER_LABELS[spot.waterType])}</span>
        {twin ? (
          <p className="meta twin-note">
            {t("Another water is also called {name}, so the links on this page open the fish of both.", { name: spot.name })}{" "}
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
            {restHere === 0 ? t("Fished here today") : restHere === 1 ? t("Last fished here yesterday") : `${tn(restHere, "Last fished here {n} day ago", "Last fished here {n} days ago")} · ${formatDay(lastHere)}`}
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
            {" · "}
            <Link to={`/map#water-${spot.id}`}>{t("See it on the Map")}</Link>
          </p>
        ) : placeFor(spot.id) ? (
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
      <WaterTipsBox catches={countedFish(catches)} on={today} within={exactTerm("water", spot.name)} place={spot.place ?? placeFor(spot.id)} />
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
      {/* The game's lake and a sample water beside the angler's own: a kind's page holds other fish, so the kind opens this water's. */}
      <BiggestHere
        catches={catches}
        spotId={spot.id}
        kindLink={(species) => (kindOnPage(book, species).some((entry) => entry.spotId === spot.id) ? speciesLink(species) : findWithLink(here, exactTerm("species", t(species))))}
      />
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
                level={4}
                key={entry.id}
                entry={entry}
                spotName={null}
                tripTitle={entry.tripId ? outingHere(entry.tripId) : null}
                list={largest ? undefined : `water:${spot.id}`}
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
    // Back to the form it was added for, which picks the new water (and a fish typed there comes back on it); a form
    // opened directly gives way to a fresh one on the water, so Back doesn't open it again.
    if (then === "catch" || then === "trip") {
      const form = then === "catch" ? "/catches/new" : "/trips/new";
      if (then === "catch") {
        const typed = readKeptDraft();
        if (typed) keepDraft({ ...typed, spotId: result.id, tripId: "" });
      }
      noteAddedWater(result.id);
      if (canGoBack() && pageBefore()?.split("?")[0] === form) navigate(-1);
      else navigate(`${form}?spot=${result.id}`, { replace: true });
    }
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
          <h1 data-title={existing ? t("Editing {name}", { name: existing.name }) : undefined}>{existing ? existing.name : t("Add a spot")}</h1>
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
              {t("This book already has a water by that name:")} <Link to={`/spots/${sameName.id}`}>{sameName.name}</Link>
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
