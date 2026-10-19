import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { canGoBack } from "./FieldShell";
import { useTypedParam } from "./typedParam";
import { editFromPage, leaveDeleted, leaveSaved } from "./leaveDeleted";
import { savedState } from "./SavedNote";
import { MapAnchor } from "./MapAnchor";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MOON_LABELS,
  biteTimes,
  WATER_LABELS,
  moonName,
  moonPhase,
  catchesForSpot,
  catchesForTrip,
  localDate,
  measureOf,
  shiftDate,
  spotById,
  tripById,
  recentTrips,
  itemsForTrip,
  tripsForSpot,
  type CatchEntry,
  type Logbook,
  type Spot,
  type TackleItem,
  type Trip,
} from "@stillwater/shared";
import { CatchCard, TripCard } from "./cards";
import { tripNeighbors } from "./catchNeighbors";
import { PagedCatches } from "./PagedCatches";
import { EditDelete } from "./EditDelete";
import { TackleList } from "./gear/TackleList";
import { useTackle } from "./gear/TackleState";
import { measureText } from "../i18n/content";
import { daysAheadLabel, fishCountLabel, fishSum, formatClock, formatDay, formatTimeOfDay, messageText, outingName, toLocalInput, tripWhen } from "./format";
import { PagedTrips } from "./PagedTrips";
import { SAME_TIME_DAYS, thisWeekInPastYears } from "./yearsAgo";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { sheetOutings, tripsCsv } from "./catchCsv";
import { LureChips, SpeciesChips } from "./SpeciesChips";
import { WaterTipsBox, sameTimeText } from "./WaterTipsBox";
import { exactTerm } from "./findLinks";
import { packingTips } from "./waterTips";
import { datedName, downloadFile } from "./download";
import { tripIcs, tripIcsName, tripsIcs } from "./tripIcs";
import { tripSummary } from "./summaries";
import { busiestHour, fishPace, sinceLastFish, totalWeight } from "./tripPace";
import { bestOutingHere, lastOutingBefore, outingAverage, outingMean, outingStreak } from "./outingAverage";
import { RecordHere, recordHere } from "./RecordHere";
import { placeFor } from "./map/places";
import { sunTimes } from "./sunTimes";
import { NearestWater, canFindNearest } from "./NearestWater";
import { CopySummary } from "./CopySummary";
import { useLogbook } from "./LogbookState";
import { TripCounts } from "./tripCounts";
import { TripWeather } from "./Weather";
import { num, t, tn, useT } from "../i18n";
import { isPlanned } from "./TripMonthHead";
import { FORM_ERROR_ID, clearInvalid, markInvalid } from "./formErrors";
import { useKeptForm } from "./keptForm";
import { addedWater, forgetAddedWater } from "./addedWater";
import { findCatches, isTimePhrase, isTimeWord } from "./CatchSearch";
import { findTrips } from "./tripSearch";
import { LATE_NIGHT_UNTIL, fishOnOutingDay } from "./suggestions";
import { countedBook, countedFish, ownFish } from "./milestones";
import { isSampleOnly, isSamplePlan, isSampleSpot, isSampleOuting, upcomingRealTrips } from "./bookCopy";
import { looseFishDays, outingFish } from "./outingFish";
import { pieceTally } from "./pieceTally";
import { WaterOptions } from "./WaterOptions";
import { speciesLink } from "./speciesLink";
import { datePicks, outingDay, ownTitle, pastTitles } from "./tripDates";
import "./search.css";
import { PLAY_LAKE_ID, offPlayLake } from "./playLake";
import { bestFishDay, bookFishDay } from "./tripMonths";
import { daysBetween, likelyWater, spotsByLastFish } from "./spotOrder";
import { notesHere } from "./outingNotes";
import { useStepKeys } from "./stepKeys";

/** The moon an outing fishes under: that day's evening, as the lake's forecast reads it. */
function tripNight(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 22);
}


/** "Fish came between 06:40 and 09:15", with the day too when the first and last fish fell on different days, and the pace when it says something. */
function fishSpan(first: string, last: string, count: number): string {
  const sameDay = localDate(new Date(first)) === localDate(new Date(last));
  // Across New Year both ends carry their year, not one end dated and the other not.
  const newYear = new Date(first).getFullYear() !== new Date(last).getFullYear();
  const show = sameDay ? formatTimeOfDay : (iso: string) => formatClock(iso, newYear || undefined);
  // Two fish in the same minute: one time, not "between 4:05 PM and 4:05 PM".
  const span = show(first) === show(last) ? t("Fish came at {time}", { time: show(first) }) : t("Fish came between {from} and {to}", { from: show(first), to: show(last) });
  const pace = fishPace(first, last, count);
  return pace ? `${span}, ${pace}` : span;
}

/** The quiet since the outing's last fish, kept current while the page stays open. */
function SinceLast({ caughtAt }: { caughtAt: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const text = sinceLastFish(caughtAt, now);
  return text ? <p className="meta since-last">{text}</p> : null;
}

/** The search for outings, kept in the address so Back from an outing returns to the same matches. */
const TRIP_FIND = "find";

/** Read the evening before, when the bag is packed: what has worked on the outing's water, and what isn't in it yet. */
export function calendarNotes(book: Logbook, trip: Trip, tackleItems: TackleItem[]): string[] {
  // Grouped as the page's "What works here" box groups them: one lure written two ways is one.
  const works = pieceTally(countedFish(catchesForSpot(book, trip.spotId)), 3).map((row) => t(row.lure));
  // In the reader's language, as the list on the page and "Copy the list" name them.
  const toPack = itemsForTrip(tackleItems, trip.id).filter((item) => !item.packed).map((item) => t(item.label));
  // When to leave: the day's light at the water, and the moon that night, as the outing's page gives them.
  const spot = spotById(book, trip.spotId);
  return [
    (spot && sunText(trip.date, spot)) || "",
    t("Moon that night: {moon}", { moon: t(MOON_LABELS[moonName(moonPhase(new Date(`${trip.date}T22:00:00`)))]) }),
    works.length > 0 ? t("Works here: {lures}", { lures: works.join(", ") }) : "",
    toPack.length > 0 ? t("Still to pack: {items}", { items: toPack.join(", ") }) : "",
  ].filter(Boolean);
}

/** One outing as a calendar file, with its notes, and the evening-before alarm for an outing still to come. */
export function saveOutingIcs(book: Logbook, trip: Trip, tackleItems: TackleItem[], today: string) {
  const spot = spotById(book, trip.spotId);
  // An untitled outing goes by its water's name, as its heading does.
  const named = { ...trip, title: outingName(trip, book.spots) };
  const alarm = trip.date > today ? t("Pack for {outing} tomorrow", { outing: named.title }) : undefined;
  downloadFile(tripIcs(named, spot?.name ?? null, new Date(), spot?.place, calendarNotes(book, trip, tackleItems), alarm), "text/calendar;charset=utf-8", tripIcsName(named));
}

export function TripsPage() {
  const { book } = useLogbook();
  const { items: tackleItems } = useTackle();
  useT();
  const [query, setQuery] = useTypedParam(TRIP_FIND);
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  // In the small hours last evening's outing is still going: still "Coming up", not a blank day in Recent.
  const fishedBy = outingDay(today);
  const upcoming = upcomingRealTrips(book, fishedBy);
  // Today's round of the game too: "Coming up" leaves it out, and "Recent" starts from yesterday.
  // The sample week's plans stay out once their day has passed too: made up, they are no blank days of the angler's.
  const recent = [
    ...book.trips.filter((trip) => trip.date >= fishedBy && trip.date <= today && !offPlayLake(trip)),
    ...recentTrips(book, fishedBy).filter((trip) => !isSamplePlan(book, trip)),
  ];
  // Each outing's fish with those logged loose that day on its water, as the average counts them.
  const fishOn = outingFish(book);
  // The angler's own outings, as Home and Bests count them: Recent's month headings count these and say the rest apart.
  const countedIds = new Set(countedBook(book).trips.map((trip) => trip.id));
  // The words that leave out the outings in Recent not counted as the angler's own, once there are some of theirs: a
  // book of only the sample week has none to show, and "mine" would open the made-up week.
  const notMine = countedIds.size > 0 && !isSampleOnly(book) ? recent.filter((trip) => !countedIds.has(trip.id)) : [];
  const onlyMine = [
    ...(notMine.some(isSampleOuting) ? [`-${t("sample|search word")}`] : []),
    ...(notMine.some((trip) => !offPlayLake(trip)) ? [`-${t("game|search word")}`] : []),
  ].join(" ");
  // How the outings already fished have gone, across every water.
  // Counted as Bests counts them: the sample week's outings go with the angler's first own outing or fish.
  // A day's fish logged without its outing count for that day's outing on that water, as a water's page and Bests count them.
  const own = countedBook(book);
  const average = outingAverage(own.trips, fishOn, fishedBy);
  // A run of outings with a fish still going, once it is three long: worth keeping up.
  const streak = outingStreak(own.trips, fishOn, fishedBy, looseFishDays(book));
  const runNow = streak.going && streak.best >= 3 ? streak.best : 0;
  // The sample's planned outings are made up: they stay out of a real calendar.
  // Today's outing with a fish in is under way, not a plan to put in a calendar.
  // Last evening's, still going in the small hours, is no day to add either.
  const toCalendar = upcoming.filter((trip) => !isSampleOuting(trip) && trip.date >= today && !(trip.date === today && fishOn(trip.id) > 0));
  const needle = query.trim();
  // A size in the search is read as the catch search reads it, and finds the outings of the fish it found.
  const fishTrips = (part: string) => new Set(findCatches(book, part, t).flatMap((entry) => (entry.tripId ? [entry.tripId] : [])));
  // "w nocy" and "at dawn" as well as "noc" and "dawn": the outings with a fish then, as Find a fish reads the phrase.
  const timeTrips = (part: string) => (isTimeWord(part, t) || isTimePhrase(part, t) ? fishTrips(part) : null);
  const found = needle ? findTrips(book, needle, fishOn, today, t, new Date(), fishTrips, timeTrips) : [];
  // The plans among them said apart, as the month headings under the count say them.
  const foundPlanned = found.filter((trip) => isPlanned(trip, today, fishOn(trip.id))).length;
  const foundLine = [
    ...(found.length > foundPlanned || foundPlanned === 0
      ? // A count among counts: "0 fish", where a card says "Nothing logged".
        [t("Outings: {count} · {fish}", { count: found.length - foundPlanned, fish: fishSum(found.reduce((sum, trip) => sum + fishOn(trip.id), 0)) })]
      : []),
    ...(foundPlanned > 0 ? [tn(foundPlanned, "{n} planned", "{n} planned")] : []),
  ].join(" · ");
  const card = (trip: Trip, level?: 4) => (
    <TripCard
      level={level}
      key={trip.id}
      trip={trip}
      spotName={spotById(book, trip.spotId)?.name ?? t("Unknown water")}
      waterType={spotById(book, trip.spotId)?.waterType ?? null}
      fishCount={fishOn(trip.id)}
      today={today}
      tomorrow={tomorrow}
    />
  );

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Calendar")}</p>
          <h1>{t("Trips")}</h1>
          <p className="lede">{t("A day on a water, and the fish that came with it.")}</p>
        </div>
        <Link to="/trips/new" className="field-primary inline">
          {t("Add a trip")}
        </Link>
      </header>
      {book.trips.length > 0 ? (
        <section className="catch-search trip-search" aria-labelledby="trip-search-head">
          {/* A heading of its own, so the matches' month headings sit under it in the outline. */}
          <h2 id="trip-search-head" className="sr-only">
            {t("Find an outing")}
          </h2>
          <label htmlFor="trip-search">{t("Find an outing")}</label>
          <input
            id="trip-search"
            type="search"
            value={query}
            placeholder={t("Water, month, a fish, “night”, “no fish”…")}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div role="status" className={needle ? (found.length === 0 ? "empty" : "search-count") : undefined}>
            {needle ? <p>{found.length === 0 ? t("No outing matches that.") : foundLine}</p> : null}
          </div>
          {found.length > 0 ? (
            <PagedTrips key={needle} trips={found} fishOn={fishOn} stack>
              {(trip) => card(trip, 4)}
            </PagedTrips>
          ) : null}
        </section>
      ) : null}
      {needle ? null : (
        <>
          <h2 className="subhead">{t("Coming up")}</h2>
          {upcoming.length === 0 ? (
            <p className="empty">
              {t("No upcoming outings.")} <Link to="/trips/new">{t("Plan one")}</Link>
            </p>
          ) : (
            <div className="stack">
              {upcoming.map((trip) => card(trip))}
            </div>
          )}
          {/* Every planned outing into the calendar in one file, rather than one at a time. */}
          {toCalendar.length > 1 ? (
            <p className="trip-calendar">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  const outings = toCalendar.map((trip) => {
                    const spot = spotById(book, trip.spotId);
                    const title = outingName(trip, book.spots);
                    return { trip: { ...trip, title }, place: spot?.name ?? null, at: spot?.place, more: calendarNotes(book, trip, tackleItems), alarm: trip.date > today ? t("Pack for {outing} tomorrow", { outing: title }) : undefined };
                  });
                  downloadFile(tripsIcs(outings), "text/calendar;charset=utf-8", datedName("stillwater-coming-up.ics"));
                }}
              >
                {t("Add all {n} to calendar", { n: toCalendar.length })}
              </button>
            </p>
          ) : null}
          <h2 className="subhead">{t("Recent")}</h2>
          {average ? <p className="meta">{average}</p> : null}
          {runNow > 0 ? <p className="meta outing-run">{tn(runNow, "A fish on each of your last {n} outings", "A fish on each of your last {n} outings")}</p> : null}
          {/* A blank spell still running, as Bests says it: the moment to change water or lure. */}
          {streak.dryNow > 1 && streak.best > 0 ? <p className="meta">{t("Outings since your last fish: {count}", { count: streak.dryNow })}</p> : null}
          {/* The sample week's and the game's outings sit among the angler's own: one tap leaves them out. */}
          {onlyMine ? (
            <p className="meta only-mine">
              {/* The link goes with Recent once the search is set: focus goes to the search, which now holds the words. */}
              <Link
                to={`/trips?${new URLSearchParams({ [TRIP_FIND]: onlyMine }).toString()}`}
                onClick={() => requestAnimationFrame(() => document.getElementById("trip-search")?.focus())}
              >
                {t("Only my outings")}
              </Link>
            </p>
          ) : null}
          {sheetOutings(book, fishedBy).trips.length > 0 ? (
            <p className="fish-csv">
              <button type="button" className="text-button" onClick={() => downloadFile(tripsCsv(book, fishedBy), "text/csv;charset=utf-8", datedName("stillwater-outings.csv"))}>
                {t("Download the outings as a spreadsheet")}
              </button>
            </p>
          ) : null}
          {recent.length === 0 ? (
            <p className="empty">{t("No past outings.")}</p>
          ) : (
            <PagedTrips trips={recent} fishOn={fishOn} counted={(trip) => countedIds.has(trip.id)} stack>
              {(trip) => card(trip, 4)}
            </PagedTrips>
          )}
        </>
      )}
    </div>
  );
}

/** Keyed by the outing, so stepping to the next one starts fresh: no open delete question or half-typed tackle carried over. */
export function TripPage() {
  const { tripId = "" } = useParams();
  return <TripView key={tripId} />;
}

/** The part of the day that gave a water strictly the most fish, once it has given five. */
function peakTime(catches: readonly CatchEntry[]): { label: string; count: number; total: number } | null {
  if (catches.length < 5) return null;
  const [top, next] = [...biteTimes({ spots: [], trips: [], catches: [...catches] })].sort((a, b) => b.count - a.count);
  return top && top.count > (next?.count ?? 0) ? { label: top.label, count: top.count, total: catches.length } : null;
}

/** The day's sunrise and sunset at the water, for a water with a place, in this device's clock. */
/** Not from the sample sheet's pin: its made-up waters sit far away, and their sunrise read on this clock would mislead (as Home leaves it out). */
function SunLine({ date, spot }: { date: string; spot: Spot }) {
  const text = sunText(date, spot);
  return text ? <p className="meta sun-line">{text}</p> : null;
}

/** The sun line's words, or null for a water with no place to read them at. */
function sunText(date: string, spot: Spot): string | null {
  const place = spot.place ?? (isSampleSpot(spot.id) ? undefined : placeFor(spot.id));
  if (!place) return null;
  const sun = sunTimes(date, place.lat, place.lng);
  return "rise" in sun
    ? t("Sunrise {rise} · sunset {set}", { rise: formatTimeOfDay(sun.rise.toISOString()), set: formatTimeOfDay(sun.set.toISOString()) })
    : sun.always === "up"
      ? t("The sun doesn't set that day.")
      : t("The sun doesn't rise that day.");
}

function TripView() {
  const { book, deleteTrip, fileCatches } = useLogbook();
  useT();
  useStepKeys();
  const navigate = useNavigate();
  const location = useLocation();
  const { tripId = "" } = useParams();
  const trip = tripById(book, tripId);
  const { items: tackleItems } = useTackle();

  if (!trip) {
    return (
      <div className="sheet">
        <h1>{t("Missing outing")}</h1>
        <p className="lede">{t("That trip is not in this book.")}</p>
        <Link to="/trips">{t("Back to trips")}</Link>
      </div>
    );
  }

  const spot = spotById(book, trip.spotId);
  const catches = catchesForTrip(book, trip.id);
  // A blank day past: the water's last fish before it, and what took it, to try next time.
  // Not when that day's fish were only logged without the outing: those are offered just above.
  const lastFishHere =
    catches.length === 0 && trip.date < outingDay(localDate(new Date())) && trip.spotId !== PLAY_LAKE_ID
      ? // Another outing here the same day counts too: a blank dusk names the morning's fish, not last month's.
        catchesForSpot(book, trip.spotId).filter(ownFish).find((entry) => entry.tripId !== trip.id && bookFishDay(book, entry) <= trip.date)
      : undefined;
  // Kinds this water gave for the first time on this outing, once earlier fish from it say what it usually gives.
  const ownHere = catches.filter(ownFish);
  const firstAt = ownHere.reduce((first, entry) => (entry.caughtAt < first ? entry.caughtAt : first), "9999");
  const before = catchesForSpot(book, trip.spotId).filter((entry) => ownFish(entry) && entry.tripId !== trip.id && entry.caughtAt < firstAt);
  const known = new Set(before.map((entry) => entry.species.trim().toLowerCase()));
  const newKinds = before.length > 0 ? [...new Set(ownHere.map((entry) => entry.species.trim()))].filter((name) => !known.has(name.toLowerCase())) : [];
  const rush = busiestHour(catches.map((entry) => entry.caughtAt));
  const weighed = totalWeight(
    catches.map((entry) => {
      const weight = measureOf(entry, "weight");
      return weight?.kind === "weight" ? weight.pounds : null;
    }),
  );
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  // In the small hours last evening's outing is still going: not yet a blank day to set against the others.
  const fishedBy = outingDay(today);
  const { newer, older } = tripNeighbors(book, trip.id);
  // With the fish logged loose that day on the water, as the outings list and the average count them.
  const fishOn = outingFish(book);
  // A day fished on a real water, against the other outings fished there, counted as the average is.
  const ownTrips = countedBook(book).trips.filter((other) => other.spotId === trip.spotId);
  // The outings set beside this one: the angler's own on a real water, the game's on its lake.
  const tripsHere = trip.spotId === PLAY_LAKE_ID ? tripsForSpot(book, trip.spotId) : ownTrips;
  const best = bestOutingHere(tripsHere, fishOn, trip.id, fishedBy);
  const fished = trip.date < fishedBy || (trip.date <= today && catches.length > 0);
  const meanHere = fished && trip.spotId !== PLAY_LAKE_ID && ownTrips.some((other) => other.id === trip.id) ? outingMean(ownTrips, fishOn, fishedBy, trip.id) : null;
  // The day's largest against the water's, from the fish counted for it: the angler's own once it has any.
  const countedHere = countedFish(catchesForSpot(book, trip.spotId));
  const countedIds = new Set(countedHere.map((entry) => entry.id));
  const sizeHere = trip.spotId === PLAY_LAKE_ID ? null : recordHere(catches.filter((entry) => countedIds.has(entry.id)), countedHere);
  // The outing on this water before this one, to set the two side by side.
  const lastHere = lastOutingBefore(tripsHere, trip.date, fishedBy, fishOn);
  const sameDayHere = tripsHere.filter((other) => other.date === trip.date && other.id !== trip.id);
  // And the one after it there, looking back from a day already fished: how the water did the next time.
  const nextHere = fished ? tripsHere.filter((other) => other.date > trip.date).sort((a, b) => a.date.localeCompare(b.date))[0] : undefined;
  const nextPlanned = nextHere && isPlanned(nextHere, today, fishOn(nextHere.id));

  // Fish from this water on the outing's day (or its small hours) that were logged without it.
  const loose = book.catches.filter(
    (entry) => entry.tripId === null && entry.spotId === trip.spotId && fishOnOutingDay(book, trip.spotId, toLocalInput(new Date(entry.caughtAt)), trip.date),
  );
  // A day of the game on its lake: no fish to log by hand, nothing to plan or pack.
  const play = trip.spotId === PLAY_LAKE_ID;
  // The sample week's outings once the book holds the angler's own: a real fish logged on one would be filed on a made-up day.
  const samplePlan = isSampleOuting(trip) && !isSampleOnly(book);
  // The book's day with the most fish, when this outing holds all of it: the angler's best day so far.
  const topDay = play || !fished ? null : bestFishDay(countedBook(book));
  const bestDay = topDay && topDay.tripId === trip.id && topDay.count >= 2;
  const tackle = play ? null : (
    <TackleList
      tripId={trip.id}
      heading={t("Tackle")}
      suggest={packingTips(book, trip, today)}
      caught={catchesForTrip(book, trip.id)}
      trips={book.trips}
      spots={book.spots}
    />
  );
  const fish = (
    <>
      <div className="section-head">
        <h2 id="outing-fish" tabIndex={-1}>
          {t("Fish on this outing")}
        </h2>
      </div>
      <FishSum catches={catches} list={`trip:${trip.id}`} />
      {/* Kept on the water, from the outing's day on: the fish that got away and the strikes that missed. */}
      {/* Not on the sample week's made-up outings beside the angler's own: a tap there would change a story, not a day. */}
      {trip.date <= today && !play && !(isSampleOuting(trip) && !isSampleOnly(book)) ? <TripCounts trip={trip} landed={catches.length} /> : null}
      {/* Out there now: how long it has been quiet, to help decide when to move. */}
      {/* An evening outing still going in the small hours counts too; a fish over 12 hours old says nothing. */}
      {catches[0] && (trip.date === today || (trip.date === shiftDate(new Date(), -1) && new Date().getHours() < LATE_NIGHT_UNTIL)) ? (
        <SinceLast caughtAt={catches[0].caughtAt} />
      ) : null}
      {catches.length > 1 ? (
        <p className="meta fish-span">
          {/* Newest first: the last in the list came first. */}
          {fishSpan(catches[catches.length - 1]!.caughtAt, catches[0]!.caughtAt, catches.length)}
        </p>
      ) : null}
      {rush && !play ? <p className="meta busiest-hour">{t("Most in one hour: {count}, from {time}", { count: rush.count, time: formatTimeOfDay(rush.from) })}</p> : null}
      {weighed && !play ? <p className="meta total-weight">{t("Total weight: {weight} ({count} weighed)", { weight: measureText({ kind: "weight", pounds: weighed.pounds }), count: weighed.count })}</p> : null}
      {/* Against every other outing on the same water. */}
      {best ? <p className="meta best-outing">{best}</p> : null}
      {meanHere !== null ? (
        <p className="meta against-average">
          {t("{fish}; your average here is {mean}", { fish: fishCountLabel(fishOn(trip.id)), mean: num(meanHere, meanHere > 0 && meanHere < 0.1 ? 2 : 1) })}
        </p>
      ) : null}
      {bestDay ? (
        <p className="meta best-day">
          <Link to="/bests">{t("Your best day in the book so far")}</Link>
        </p>
      ) : null}
      {sizeHere ? <RecordHere {...sizeHere} recordDay={bookFishDay(book, sizeHere.record)} /> : null}
      {lastHere ? (
        <p className="meta last-here">
          <Link to={`/trips/${lastHere.id}`}>
            {t("Last time here, {day}: {fish}", { day: formatDay(lastHere.date), fish: fishCountLabel(fishOn(lastHere.id)) })}
          </Link>
          {/* Before going back: how long the water has rested. */}
          {trip.date >= today && daysBetween(lastHere.date, today) >= 2 ? ` · ${tn(daysBetween(lastHere.date, today), "{n} day ago", "{n} days ago")}` : null}
        </p>
      ) : null}
      {/* A dawn and a dusk on one water and day: each says the other, with what it gave. */}
      {sameDayHere.length > 0 ? (
        <p className="meta same-day-here">
          {t("Also here that day:")}{" "}
          {sameDayHere.map((other, index) => (
            <Fragment key={other.id}>
              {index > 0 ? "; " : null}
              <Link to={`/trips/${other.id}`}>{`${outingName(other, book.spots)}, ${fishCountLabel(fishOn(other.id))}`}</Link>
            </Fragment>
          ))}
        </p>
      ) : null}
      {nextHere ? (
        <p className="meta next-here">
          <Link to={`/trips/${nextHere.id}`}>
            {nextPlanned
              ? t("Next time here: {day}", { day: formatDay(nextHere.date) })
              : t("Next time here, {day}: {fish}", { day: formatDay(nextHere.date), fish: fishCountLabel(fishOn(nextHere.id)) })}
          </Link>
        </p>
      ) : null}
      {/* Before going back: what was learned there last time, in the angler's own words. */}
      {lastHere?.note.trim() && trip.date >= today ? <p className="meta last-note">{t("Last time you wrote: “{note}”", { note: lastHere.note.trim() })}</p> : null}
      {/* A game day's kinds open its own fish there, not the kind's page of the angler's own. */}
      <SpeciesChips catches={catches} outing={play ? trip : undefined} />
      {newKinds.length > 0 ? (
        <p className="meta new-kinds">
          {t("First time at this water:")}{" "}
          {newKinds.map((name, index) => (
            <Fragment key={name}>
              {index > 0 ? ", " : null}
              <Link to={speciesLink(name)}>{t(name)}</Link>
            </Fragment>
          ))}
        </p>
      ) : null}
      <LureChips catches={catches} outing={trip} water={spot?.name} />
      <FishCsv catches={catches} name={`${trip.date} ${outingName(trip, book.spots)}`} />
      {loose.length > 0 ? (
        <p className="meta loose-fish" role="status">
          {tn(loose.length, "{n} fish from this water that day is not on this outing.", "{n} fish from this water that day are not on this outing.")}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              // The line and its button go once the fish are filed: the fish list's heading takes focus.
              if (fileCatches(loose.map((entry) => entry.id), trip.id)) document.getElementById("outing-fish")?.focus();
            }}
          >
            {tn(loose.length, "Add it", "Add them")}
          </button>
        </p>
      ) : null}
      {catches.length === 0 ? (
        <p className="empty">
          {trip.date > today ? t("Fish you log on the day show up here.") : trip.date >= fishedBy ? t("No fish logged yet today.") : t("Nothing logged for this trip yet.")}
          {lastFishHere && loose.length === 0 ? (
            <>
              {" "}
              <Link to={`/catches/${lastFishHere.id}`} className="last-fish-here">
                {lastFishHere.lure.trim()
                  ? t("Last fish here: {species} on {lure}, {day}", { species: t(lastFishHere.species), lure: t(lastFishHere.lure), day: formatDay(bookFishDay(book, lastFishHere)) })
                  : t("Last fish here: {species}, {day}", { species: t(lastFishHere.species), day: formatDay(bookFishDay(book, lastFishHere)) })}
              </Link>
            </>
          ) : null}
          {trip.date >= fishedBy && trip.date <= today && !play && !samplePlan ? (
            <>
              {" "}
              <Link to={`/catches/new?trip=${trip.id}&spot=${trip.spotId}`}>{t("Log the first one")}</Link>
            </>
          ) : null}
        </p>
      ) : (
        // A past outing reads as the day went, first fish first, like its weather; on the day, the newest leads.
        <PagedCatches items={trip.date < today ? [...catches].reverse() : catches}>
          {(entry) => (
            <CatchCard
              key={entry.id}
              entry={entry}
              // The outing's own water is in its header; only a fish from elsewhere names its water.
              spotName={entry.spotId === trip.spotId ? null : (spotById(book, entry.spotId)?.name ?? t("Unknown water"))}
              tripTitle={null}
              list={`trip:${trip.id}`}
            />
          )}
        </PagedCatches>
      )}
    </>
  );
  // From the outing's own day on, the fish lead: on the water, the bag is already packed.
  const fishFirst = catches.length > 0 || trip.date <= today;

  return (
    <div className="sheet">
      <EditDelete
        editTo={`/trips/${trip.id}/edit`}
        ask={t("Delete this outing? Its fish stay in the book.")}
        onDelete={() => {
          if (deleteTrip(trip.id)) leaveDeleted(navigate, location.state, "/trips");
        }}
        aside={
          // An outing still ahead has no fish to log yet; a catch can't be dated in the future.
          trip.date <= today && !play && !samplePlan ? (
            <Link to={`/catches/new?trip=${trip.id}&spot=${trip.spotId}`} className="field-primary inline">
              {t("Add a catch")}
            </Link>
          ) : null
        }
      >
        <p className="eyebrow">
          <Link to="/trips">{t("Trips")}</Link>
          {" · "}
          {tripWhen(trip.date, today, tomorrow)}
          {daysAheadLabel(trip.date, today) ? ` · ${daysAheadLabel(trip.date, today)}` : null}
        </p>
        {/* The tab tells untitled outings on one water apart by their day. */}
        <h1 data-title={`${outingName(trip, book.spots)} · ${formatDay(trip.date)}`}>{outingName(trip, book.spots)}</h1>
        <p className="meta stand">
          <time dateTime={trip.date}>{formatDay(trip.date)}</time>
          {spot ? (
            <>
              {" · "}
              <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
              {" · "}
              {t(WATER_LABELS[spot.waterType])}
              {/* On the way there: the water's pin, one tap from the outing. */}
              {spot.place ? (
                <span className="map-link">
                  {" · "}
                  <MapAnchor lat={spot.place.lat} lng={spot.place.lng}>
                    {t("Open on a map")}
                  </MapAnchor>
                  {/* Beside the angler's other waters, on the field log's own map. */}
                  {play ? null : (
                    <>
                      {" · "}
                      <Link to={`/map#water-${spot.id}`}>{t("See it on the Map")}</Link>
                    </>
                  )}
                </span>
              ) : !play && placeFor(spot.id) ? (
                // A sample water: no real place to open, but a pin on the field log's own sheet, as its page links it.
                <span className="map-link">
                  {" · "}
                  <Link to={`/map#water-${spot.id}`}>{t("See it on the Map")}</Link>
                </span>
              ) : null}
            </>
          ) : null}
        </p>
        <p className="meta moon-line">{t("Moon: {phase}", { phase: t(MOON_LABELS[moonName(moonPhase(tripNight(trip.date)))]) })}</p>
        {spot ? <SunLine date={trip.date} spot={spot} /> : null}
      </EditDelete>
      {trip.note ? (
        <p className="prose">{trip.note}</p>
      ) : !play && trip.date <= today ? (
        // A day fished with nothing written: the note is one tap away, not behind Edit.
        <p className="trip-write-up">
          <Link to={`/trips/${trip.id}/edit?${NOTE_PARAM}=1`} state={editFromPage(location.state)}>
            {t("Write up the day")}
          </Link>
        </p>
      ) : null}
      {/* The sample week's planned days stay off a calendar, as "Add all to calendar" leaves them out. */}
      {/* Today's outing under way (a fish in) is no plan any more: it goes on to Go again, as a past one does. */}
      {play || isSampleOuting(trip) ? null : !fished ? (
        <>
        <p className="trip-calendar">
          <button
            type="button"
            className="text-button"
            onClick={() => saveOutingIcs(book, trip, tackleItems, today)}
          >
            {t("Add to calendar")}
          </button>
          {" · "}
          {/* The outing and its tackle list on paper, to tick off while packing. */}
          <button type="button" className="text-button" onClick={() => window.print()}>
            {t("Print the packing list")}
          </button>
        </p>
          {/* Plans are made with someone: the day, the water, what works there and what is still to pack, for a message. */}
          <CopySummary
            text={() => [`${outingName(trip, book.spots)} · ${formatDay(trip.date)} · ${spot?.name ?? t("Unknown water")}`, ...calendarNotes(book, trip, tackleItems), trip.note.trim()].filter(Boolean).join("\n")}
            file="stillwater-plan.txt"
            label={t("Copy the plan")}
            copied={t("Plan copied.")}
            saved={t("Plan saved as a file.")}
          />
        </>
      ) : (
        spot ? (
          <p className="trip-again">
            <Link to={`/trips/new?spot=${spot.id}&again=${trip.id}`}>{t("Go again")}</Link>
          </p>
        ) : null
      )}
      {/* A hard day is worth telling too: a past blank outing with a note, or fish lost or missed. Today's plan with only a note isn't a day yet. */}
      {catches.length > 0 || (!samplePlan && (trip.date < fishedBy || trip.lost || trip.missed) && (trip.note.trim() || trip.lost || trip.missed)) ? <CopySummary text={() => tripSummary(trip, spot?.name ?? null, catches, (id) => spotById(book, id)?.name ?? null)} file="stillwater-outing.txt" /> : null}
      {/* Planning ahead: what has worked on this water before. */}
      {!fished && spot && !play ? <WaterTipsBox catches={countedFish(catchesForSpot(book, spot.id))} on={trip.date} within={exactTerm("water", spot.name)} /> : null}
      <TripWeather catches={catches} />
      {/* Once the day comes, the fish lead; before that, the bag does. */}
      {fishFirst ? fish : tackle}
      {fishFirst ? tackle : fish}
      {newer || older ? (
        <nav className="catch-steps" aria-label={t("More outings")}>
          {newer ? (
            <Link to={`/trips/${newer.id}`} rel="prev">
              {t("← Later: {title}", { title: `${outingName(newer, book.spots)}, ${formatDay(newer.date)}` })}
            </Link>
          ) : (
            <span />
          )}
          {older ? (
            <Link to={`/trips/${older.id}`} rel="next">
              {t("Earlier: {title} →", { title: `${outingName(older, book.spots)}, ${formatDay(older.date)}` })}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

/** In an outing's edit link: open with the note in focus, to write the day up. */
const NOTE_PARAM = "note";

export function TripFormPage() {
  const { tripId } = useParams();
  const [params] = useSearchParams();
  return <TripForm key={`${tripId ?? ""}:${params.toString()}`} />;
}

function TripForm() {
  const { book, storedBook, addTrip, updateTrip } = useLogbook();
  useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { tripId } = useParams();
  const [params] = useSearchParams();
  const existing = tripId ? tripById(book, tripId) : undefined;
  // "Go again" from a past outing: same water and title, and its tackle list comes along.
  const again = existing ? undefined : tripById(book, params.get("again") ?? "");
  const cancelSpot = !existing && !params.has("loose") && book.spots.some((spot) => spot.id === params.get("spot") && spot.id !== PLAY_LAKE_ID) ? params.get("spot") : null;
  const { items, add } = useTackle();
  const againTackle = again ? itemsForTrip(items, again.id) : [];
  // In the small hours, last night's water is still the one fished.
  const smallHours = new Date().getHours() < LATE_NIGHT_UNTIL;
  const guess = likelyWater(book, localDate(new Date()), smallHours);
  const lastEvening = shiftDate(new Date(), -1);
  // Logged after midnight on a night session with no outing yet: the outing is last night's, and the night's fish so
  // far (the evening's and the small hours') go on it, rather than splitting the session over two days.
  const [nightOuting] = useState(
    () =>
      !existing &&
      !params.has("date") &&
      smallHours &&
      !countedBook(book).trips.some((trip) => trip.spotId === guess && (trip.date === lastEvening || trip.date === localDate(new Date()))) &&
      book.catches.some((entry) => !entry.tripId && entry.spotId === guess && fishOnOutingDay(book, guess, toLocalInput(new Date(entry.caughtAt)), lastEvening)),
  );
  // Never the game's lake: its days are made by playing.
  // "Go again" opens on the first day ahead with no outing on that water yet, not on today's outing there.
  const againDate = again
    ? datePicks(new Date())
        .map((pick) => pick.date)
        .find((day) => day >= localDate(new Date()) && !countedBook(book).trips.some((trip) => trip.spotId === again.spotId && trip.date === day))
    : undefined;
  const presetDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? (params.get("date") as string) : nightOuting ? lastEvening : (againDate ?? localDate(new Date()));
  // Unasked, not a water that already has an outing that day: the next one fished, if any is free.
  // The sample week's made-up plans don't count once the book has the angler's own, as Coming up leaves them out.
  const busy = (spotId: string) => countedBook(book).trips.some((trip) => trip.spotId === spotId && trip.date === presetDate);
  // A new book holds only the sample week's made-up waters.
  const onlySampleWaters = !existing && book.spots.every((spot) => spot.id === PLAY_LAKE_ID || isSampleSpot(spot.id));
  // A water just added from this form's "Add a spot" comes back picked.
  const [justAdded] = useState(() => (!existing && book.spots.some((spot) => spot.id === addedWater() && spot.id !== PLAY_LAKE_ID) ? addedWater() : null));
  useEffect(() => forgetAddedWater(), []);
  const preset = justAdded
    ? justAdded
    : book.spots.some((spot) => spot.id === params.get("spot") && spot.id !== PLAY_LAKE_ID)
    ? (params.get("spot") as string)
    : busy(guess)
      ? // The next water by the angler's own fish, never one of the sample week's made-up waters.
        (spotsByLastFish({ ...book, catches: countedFish(book.catches) }).map((row) => row.spot.id).find((id) => id !== PLAY_LAKE_ID && !isSampleSpot(id) && !busy(id)) ?? guess)
      : guess;
  const [date, setDate] = useState(existing?.date ?? presetDate);
  const [spotId, setSpotId] = useState(existing?.spotId ?? preset);
  // Planning a day on a water: how the last one there went.
  // The same outing "Last time here" names on the outing's page, before the day picked.
  const lastHere = existing || !spotId
    ? undefined
    : lastOutingBefore(
        spotId === PLAY_LAKE_ID ? tripsForSpot(book, spotId) : countedBook(book).trips.filter((trip) => trip.spotId === spotId),
        /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "9999",
        outingDay(localDate(new Date())),
        outingFish(book),
      );
  const pickedSpot = spotById(book, spotId);
  const notesBefore =
    existing || !spotId || spotId === PLAY_LAKE_ID
      ? []
      : notesHere(
          countedBook(book).trips.filter((trip) => trip.spotId === spotId && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || trip.date < date)),
          localDate(new Date()),
          2,
          (id) => catchesForTrip(book, id).length,
        );
  const peak = spotId && spotId !== PLAY_LAKE_ID ? peakTime(countedFish(catchesForSpot(book, spotId))) : null;
  // A second outing on the same water and day is usually a slip; say which one is already there.
  const sameDay = countedBook(book).trips.find((trip) => trip.spotId === spotId && trip.date === date && trip.id !== existing?.id);
  // What this water gave around the same date in earlier years, for an outing being planned.
  const pastWeek = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    if (existing || !y || !m || !d) return [];
    return thisWeekInPastYears(countedFish(catchesForSpot(book, spotId)), new Date(y, m - 1, d, 12), SAME_TIME_DAYS, Infinity);
  }, [book, spotId, date, existing]);
  // Made from a fish logged without an outing: that day's fish (and its small hours') on this water with none go on the new one.
  const loose = useMemo(
    () =>
      existing || (!params.has("loose") && !nightOuting)
        ? []
        : book.catches
            .filter((entry) => !entry.tripId && entry.spotId === spotId && fishOnOutingDay(book, spotId, toLocalInput(new Date(entry.caughtAt)), date))
            .map((entry) => entry.id),
    [book, existing, params, nightOuting, spotId, date],
  );
  // An untitled outing is saved under its water's name: the box stays empty, so a change of water renames it too.
  const [title, setTitle] = useState(() => {
    const from = existing ?? again;
    return from ? ownTitle(from, book.spots) : "";
  });
  // Names already given, offered as the title is typed.
  const titles = useMemo(() => pastTitles(book, spotId), [book, spotId]);
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");
  // Unsaved changes to an outing in the book wait for the next visit to its form.
  const kept = useKeptForm(
    existing ? `trip:${existing.id}` : null,
    existing ? JSON.stringify(storedBook.trips.find((trip) => trip.id === existing.id) ?? existing) : "",
    { date, spotId, title, note },
    (fields) => {
      if (fields.date) setDate(fields.date);
      if (book.spots.some((spot) => spot.id === fields.spotId)) setSpotId(fields.spotId!);
      setTitle(fields.title ?? "");
      setNote(fields.note ?? "");
    },
  );

  // An outing with fish already on it: they go where it goes, but they keep the times they were caught.
  const ownFish = existing ? catchesForTrip(book, existing.id) : [];
  const fishDays = ownFish.filter((entry) => fishOnOutingDay(book, spotId, toLocalInput(new Date(entry.caughtAt)), date, true)).length;
  const firstFishDay = ownFish.length > 0 ? localDate(new Date([...ownFish].sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))[0]!.caughtAt)) : null;
  const today = localDate(new Date());

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Fish already caught can't sit on an outing still to come.
    if (firstFishDay && date > today) {
      setError(t("This outing already has fish, so it can't be moved to a day still to come."));
      markInvalid(event.currentTarget as HTMLFormElement, "date");
      return;
    }
    const draft = { date, spotId, title, note };
    const result = existing ? updateTrip(existing.id, draft) : addTrip(draft, loose);
    if (!result.ok) {
      setError(result.message);
      markInvalid(event.currentTarget as HTMLFormElement, result.field);
      return;
    }
    for (const item of againTackle) add(result.id, item.label);
    kept.drop();
    // The form gives way to the outing it saved, so Back doesn't open it again, and the save is said.
    if (existing) leaveSaved(navigate, location.state, `/trips/${result.id}`);
    else navigate(`/trips/${result.id}`, { replace: true, ...savedState("trip") });
  };

  if (tripId && !existing) {
    return (
      <div className="sheet">
        <h1>{t("Missing outing")}</h1>
        <p className="lede">{t("That trip is not in this book.")}</p>
        <Link to="/trips">{t("Back to trips")}</Link>
      </div>
    );
  }

  // The game's lake alone is no water to log a real day on.
  if (!existing && !book.spots.some((spot) => spot.id !== PLAY_LAKE_ID)) {
    return (
      <div className="sheet">
        <h1>{t("Add a trip")}</h1>
        <p className="lede">{t("Add a spot first so the outing has a water.")}</p>
        <Link to="/spots/new?then=trip" className="field-primary inline">
          {t("Add a spot")}
        </Link>
      </div>
    );
  }

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{existing ? t("Edit outing") : t("New outing")}</p>
          <h1 data-title={existing ? t("Editing {name}", { name: outingName(existing, book.spots) }) : undefined}>{existing ? outingName(existing, book.spots) : t("Add a trip")}</h1>
        </div>
        {/* Cancel goes back where the form was opened (the outing, a fish, the map, a water); opened by a link from outside, to the outing or water it names. */}
        <Link
          to={existing ? `/trips/${existing.id}` : again ? `/trips/${again.id}` : cancelSpot ? `/spots/${cancelSpot}` : "/trips"}
          onClick={(event) => {
            kept.drop();
            if (!canGoBack()) return;
            event.preventDefault();
            navigate(-1);
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
          <div className="date-field">
          <label>
            {t("Date")}
            <input name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
            {/* Outside the label, so the date box keeps its one-word name. */}
            {!existing ? (
              <small className="field-hint lure-tips date-picks" role="group" aria-label={t("Pick a day")}>
                {datePicks(new Date()).map((pick) => (
                  <button key={pick.label} type="button" className="lure-tip" aria-pressed={date === pick.date} onClick={() => setDate(pick.date)}>
                    {t(pick.label)}
                  </button>
                ))}
              </small>
            ) : null}
          </div>
          <div className="water-field">
            <label>
              {t("Spot")}
              <select name="spot" value={spotId} aria-describedby={[lastHere ? "last-here" : "", onlySampleWaters ? "own-water-hint" : ""].filter(Boolean).join(" ") || undefined} onChange={(event) => setSpotId(event.target.value)}>
                {/* The game's lake only for what is already there, and a game day stays on it. */}
                <WaterOptions book={book} spots={book.spots.filter((spot) => (existing?.spotId === PLAY_LAKE_ID ? spot.id === PLAY_LAKE_ID : spot.id !== PLAY_LAKE_ID || spot.id === spotId))} />
              </select>
            </label>
            {/* A new book holds only the sample week's made-up waters: a first plan goes on the angler's own, as a first fish does. */}
            {onlySampleWaters ? (
              <span className="field-hint own-water" id="own-water-hint">
                {t("These waters are invented.")} <Link to="/spots/new?then=trip">{t("Add the one you'll fish")}</Link>
              </span>
            ) : null}
            {/* Outside the label, so the field's name stays "Spot" while this changes with each pick. */}
            {lastHere ? (
              <small className="field-hint" id="last-here">
                {/* An untitled outing goes by the water's name, which the field above already shows. */}
                {outingName(lastHere, book.spots) === spotById(book, lastHere.spotId)?.name
                  ? t("Last here: {day} · {fish}", { day: formatDay(lastHere.date), fish: fishCountLabel(outingFish(book)(lastHere.id)) })
                  : t("Last here: {title}, {day} · {fish}", {
                      title: outingName(lastHere, book.spots),
                      day: formatDay(lastHere.date),
                      fish: fishCountLabel(outingFish(book)(lastHere.id)),
                    })}
              </small>
            ) : null}
            {/* Planning a day on a water: what was learned on the last days there, in the angler's own words. */}
            {notesBefore.length > 0 ? (
              <small className="field-hint notes-before">
                {t("From your outing notes here:")}{" "}
                {notesBefore.map(({ trip, text }, index) => (
                  <Fragment key={trip.id}>
                    {index > 0 ? " · " : null}
                    {formatDay(trip.date)}: {t("“{query}”", { query: text })}
                  </Fragment>
                ))}
              </small>
            ) : null}
            {/* The light that day at the water picked, while the outing is planned around it. */}
            {pickedSpot && /^\d{4}-\d{2}-\d{2}$/.test(date) ? <SunLine date={date} spot={pickedSpot} /> : null}
            {/* The moon that night, which the water tips and Home weigh too. */}
            {/^\d{4}-\d{2}-\d{2}$/.test(date) ? <p className="meta moon-line">{t("Moon that night: {moon}", { moon: t(MOON_LABELS[moonName(moonPhase(new Date(`${date}T22:00:00`)))]) })}</p> : null}
            {/* Planning a day here: the hours this water has given the most. */}
            {!existing && peak ? <p className="meta peak-hours">{t("Most fish here: {time} ({count} of {total})", { time: t(peak.label).toLowerCase(), count: peak.count, total: peak.total })}</p> : null}
            {!existing && canFindNearest(book) ? <NearestWater book={book} onPick={setSpotId} /> : null}
          </div>
          {pastWeek.length > 0 ? (
            <p className="wide form-note">
              {sameTimeText(pastWeek)}
            </p>
          ) : null}
          {sameDay ? (
            <p className="wide form-note" role="status">
              {t("You already have an outing on this water that day:")} <Link to={`/trips/${sameDay.id}`}>{outingName(sameDay, book.spots)}</Link>
            </p>
          ) : null}
          {existing && ownFish.length > 0 && spotId !== existing.spotId ? (
            <p className="wide form-note" role="status">
              {tn(ownFish.length, "Its fish moves to this water too.", "Its {n} fish move to this water too.")}
            </p>
          ) : null}
          {existing && firstFishDay && date !== existing.date && fishDays === 0 ? (
            <p className="wide form-note" role="status">
              {tn(ownFish.length, "Its fish was caught on {day} and keeps that day.", "Its fish were caught on {day} and keep that day.", { day: formatDay(firstFishDay) })}
            </p>
          ) : null}
          {loose.length > 0 ? (
            <p className="wide form-note" role="status">
              {tn(loose.length, "The fish you logged here that day goes on this outing.", "The {n} fish you logged here that day go on this outing.")}
            </p>
          ) : null}
          <label className="wide">
            {t("Title")}
            <input
              name="title"
              maxLength={60}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("Dawn patrol")}
              list={titles.length > 0 ? "trip-titles" : undefined}
            />
            {titles.length > 0 ? (
              <datalist id="trip-titles">
                {titles.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ) : null}
          </label>
          <label className="wide">
            {t("Note")}
            <textarea
              name="note"
              autoFocus={params.get(NOTE_PARAM) === "1"}
              maxLength={400}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("Wind, water color, what you meant to try.")}
            />
          </label>
        </div>
        {again && againTackle.length > 0 ? (
          <p className="again-note">
            {t("The tackle list from “{title}” comes along, unpacked.", { title: outingName(again, book.spots) })}
          </p>
        ) : null}
        {error ? (
          <p className="field-error" role="alert" id={FORM_ERROR_ID}>
            {messageText(error)}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline">
          {existing ? t("Save changes") : t("Save trip")}
        </button>
      </form>
    </div>
  );
}

