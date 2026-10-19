import { Fragment, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  WATER_LABELS,
  catchesForTrip,
  fishCountsByTrip,
  localDate,
  lureTally,
  measureOf,
  recentTrips,
  shiftDate,
  spotById,
  tripById,
  type Trip,
} from "@stillwater/shared";
import { fishCountLabel, formatDay, outingName, tripWhen } from "../format";
import { bookFishDay } from "../tripMonths";
import { useLogbook } from "../LogbookState";
import { TackleList } from "./TackleList";
import { useTackle } from "./TackleState";
import { renamedTackle } from "./renamedTackle";
import { undoneTackle } from "./undoneTackle";
import { pieceRecords, type PieceRecord } from "./pieceRecord";
import { ChoiceRow } from "../ChoiceRow";
import { shownPieceKey } from "./pieceKey";
import { notYetThisYear } from "../bests/notYet";
import { exactTerm, findLink } from "../findLinks";
import { packingTips } from "../waterTips";
import { nearTwinLures } from "../suggestions";
import { renameInBook } from "../bookRename";
import { PagedTrips } from "../PagedTrips";
import { countedSearch } from "../countedSearch";
import { locale, t, tn, useT } from "../../i18n";
import { measureText } from "../../i18n/content";
import { offPlayLake } from "../playLake";
import { countedBook, ownFish } from "../milestones";
import { upcomingRealTrips } from "../bookCopy";

function TripTackle({ trip, today, tomorrow }: { trip: Trip; today: string; tomorrow: string }) {
  const { book } = useLogbook();
  useT();
  const spot = spotById(book, trip.spotId);

  return (
    <section className="tackle-trip">
      <div className="section-head">
        {/* Under "Coming up". */}
        <h3 className="tackle-trip-title">
          <Link to={`/trips/${trip.id}`}>{outingName(trip, book.spots)}</Link>
        </h3>
        <span className="meta">
          {tripWhen(trip.date, today, tomorrow)}
          {spot && spot.name !== outingName(trip, book.spots) ? ` · ${spot.name}` : ""}
        </span>
      </div>
      <TackleList
        tripId={trip.id}
        name={t("Tackle for {trip}", { trip: outingName(trip, book.spots) })}
        suggest={packingTips(book, trip, today)}
        trips={book.trips}
        spots={book.spots}
        // Today's outing may already have fish, counted against the pieces as on the outing's page.
        caught={trip.date <= today ? catchesForTrip(book, trip.id) : undefined}
      />
    </section>
  );
}

/** How many lures the record lists before the rest. */
const RECORD_ROWS = 8;

/** How the lure record is ordered, kept for the next visit: most fish, fish an outing, or the newest fish. */
type LureOrder = "most" | "rate" | "latest";
const LURE_ORDER_KEY = "stillwater.field-log.lure-order.v1";

function readLureOrder(): LureOrder {
  try {
    const stored = localStorage.getItem(LURE_ORDER_KEY);
    return stored === "rate" || stored === "latest" ? stored : "most";
  } catch {
    return "most";
  }
}

/** The records in the order picked; ties keep the most-fish order they came in. */
export function orderedRecords(records: readonly PieceRecord[], order: LureOrder): PieceRecord[] {
  const rows = [...records];
  if (order === "rate") rows.sort((a, b) => b.fish / b.outings - a.fish / a.outings);
  // Lures that never took a fish go last.
  if (order === "latest") rows.sort((a, b) => (b.lastAt ? Date.parse(b.lastAt) : 0) - (a.lastAt ? Date.parse(a.lastAt) : 0));
  return rows;
}

/** Each lure taken on past outings: the outings it went on and the fish it took there, most fish first. */
/** Outings a lure goes out on without a fish before the record says it may as well stay home. */
const NEVER_TOOK_OUTINGS = 4;

/** Fish per outing a lure went on, to one decimal: "0.8". */
export function lureRate(fish: number, outings: number): string {
  return (fish / outings).toLocaleString(locale(), { maximumFractionDigits: 1 });
}

function LureRecord({ today }: { today: string }) {
  const { book } = useLogbook();
  const { items, add } = useTackle();
  const [order, setOrder] = useState(readLureOrder);
  const pickOrder = (next: LureOrder) => {
    setOrder(next);
    try {
      localStorage.setItem(LURE_ORDER_KEY, next);
    } catch {
      // Storage blocked: the order holds for this visit.
    }
  };
  // The order picked holds while its control shows.
  const found = pieceRecords(book, items, today);
  const records = orderedRecords(found, found.length > 2 ? order : "most");
  // The book the record counts: the sample week's made-up lures go with the first outing of the angler's own.
  const quiet = notYetThisYear(countedBook(book).catches, new Date(), (entry) => entry.lure, (entry) => bookFishDay(book, entry));
  const [all, setAll] = useState(false);
  // A lure that took fish goes straight into the next outing's bag, unless it is already there.
  const next = upcomingRealTrips(book, today)[0];
  const onNext = new Set(next ? items.filter((item) => item.tripId === next.id).map((item) => shownPieceKey(item.label)) : []);
  const [justPacked, setJustPacked] = useState<string | null>(null);
  // The button goes once the lure is on the list: focus moves to the line saying so.
  const focusPacked = useRef(false);
  // The record's best lures not yet on that list, packed in one go.
  const best = next ? orderedRecords(found, "most").filter((row) => row.fish > 0 && !onNext.has(shownPieceKey(row.label))).slice(0, 3) : [];
  const [packedBest, setPackedBest] = useState<string[] | null>(null);
  const focusPackedBest = useRef(false);
  if (records.length === 0) return null;
  const fold = records.length > RECORD_ROWS;
  const blanks = records.filter((row) => row.fish === 0 && row.outings >= NEVER_TOOK_OUTINGS);
  return (
    <>
      {/* Where focus goes once the last lure line above is settled. */}
      <h2 className="subhead" id="lure-record" tabIndex={-1}>
        {t("Lure record")}
      </h2>
      {records.length > 2 ? (
        <div className="spot-order">
          <ChoiceRow<LureOrder>
            wrap
            label={t("Order")}
            value={order}
            options={[
              { id: "most", label: t("Most fish") },
              { id: "rate", label: t("Most fish an outing") },
              { id: "latest", label: t("Last fish") },
            ]}
            onChange={pickOrder}
          />
        </div>
      ) : null}
      <ul className="species-waters lure-record">
        {(all ? records : records.slice(0, RECORD_ROWS)).map((row) => (
          <li key={row.label}>
            {/* A lure that took fish opens them in the catch search. */}
            {row.lure ? <Link to={findLink(countedSearch(book, exactTerm("lure", t(row.lure)), book.catches.filter((entry) => entry.lure.trim().toLowerCase() === row.lure!.trim().toLowerCase())))}>{t(row.label)}</Link> : <span>{t(row.label)}</span>}
            <span className="meta">
              {fishCountLabel(row.fish)} · {tn(row.outings, "{n} outing", "{n} outings")}
              {/* How often it pays, once it has been out more than once. */}
              {row.fish > 0 && row.outings >= 2 ? ` · ${t("{n} fish an outing", { n: lureRate(row.fish, row.outings) })}` : null}
              {/* On a line of its own: beside the counts it broke mid-phrase on a phone. */}
              {row.lastAt && row.lastDay ? (
                <>
                  <span className="lure-last">{t("last fish {day}", { day: formatDay(row.lastDay) })}</span>
                  {/* Packed since without a fish: a lure that has gone quiet. */}
                  {row.since && row.since >= 2 ? <span className="lure-last">{tn(row.since, "none on {n} outing since", "none on {n} outings since")}</span> : null}
                  {/* Its biggest fish, opening that fish. */}
                  {row.largest ? (
                    <span className="lure-last">
                      <Link to={`/catches/${row.largest.entry.id}`}>
                        {t("Largest: {species}, {size}", { species: t(row.largest.entry.species), size: measureText(measureOf(row.largest.entry, row.largest.by)!) })}
                      </Link>
                    </span>
                  ) : null}
                </>
              ) : null}
              {next && justPacked === row.label && onNext.has(shownPieceKey(row.label)) ? (
                <span
                  className="lure-last"
                  tabIndex={-1}
                  ref={(line) => {
                    if (line && focusPacked.current) {
                      focusPacked.current = false;
                      line.focus();
                    }
                  }}
                >
                  {t("On the list for {outing}", { outing: outingName(next, book.spots) })}
                </span>
              ) : next && row.fish > 0 && !onNext.has(shownPieceKey(row.label)) ? (
                <span className="lure-last">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (add(next.id, row.label) !== null) return;
                      focusPacked.current = true;
                      setJustPacked(row.label);
                    }}
                  >
                    {t("Pack for {outing}", { outing: outingName(next, book.spots) })}
                    {/* Which lure, for a list of buttons that would otherwise all read the same. */}
                    <span className="sr-only">: {t(row.label)}</span>
                  </button>
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {/* Said while those lures are still on the list; once one comes off, the button offers the best again. */}
      {next && packedBest && packedBest.every((label) => onNext.has(shownPieceKey(label))) ? (
        <p
          className="meta packed-best"
          tabIndex={-1}
          ref={(line) => {
            if (line && focusPackedBest.current) {
              focusPackedBest.current = false;
              line.focus();
            }
          }}
        >
          {t("Packed: {lures}.", { lures: packedBest.map((label) => t(label)).join(", ") })}
        </p>
      ) : next && best.length >= 2 ? (
        <p className="meta packed-best">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const packed = best.filter((row) => add(next.id, row.label) === null).map((row) => row.label);
              if (packed.length === 0) return;
              focusPackedBest.current = true;
              setPackedBest(packed);
            }}
          >
            {t("Pack the {n} best for {outing}", { n: best.length, outing: outingName(next, book.spots) })}
          </button>
        </p>
      ) : null}
      {fold ? (
        <p className="tally-more">
          <button type="button" className="text-button" aria-expanded={all} onClick={() => setAll((open) => !open)}>
            {all ? t("Show fewer") : t("Show all {count}", { count: records.length })}
          </button>
        </p>
      ) : null}
      {/* Packed again and again and never a fish: a lure that may as well stay home, said where the folded list hides it. */}
      {blanks.length > 0 ? (
        <p className="meta never-took">
          {t("Packed for {n} or more outings without a fish: {lures}.", { n: NEVER_TOOK_OUTINGS, lures: blanks.map((row) => `${t(row.label)} (${row.outings})`).join(", ") })}
        </p>
      ) : null}
      {/* Lures that took fish last year and none yet this year: worth a swim before the season ends. */}
      {quiet.length > 0 ? (
        <p className="meta not-yet">
          <span>
            {t("Not yet this year:")}{" "}
            {quiet.map((lure, index) => (
              <Fragment key={lure}>
                {index > 0 ? ", " : null}
                <Link to={findLink(countedSearch(book, exactTerm("lure", t(lure)), book.catches.filter((entry) => entry.lure.trim().toLowerCase() === lure.trim().toLowerCase())))}>{t(lure)}</Link>
              </Fragment>
            ))}
          </span>
        </p>
      ) : null}
    </>
  );
}

/** Pairs the angler said are two lures, kept in this browser so the line doesn't come back. */
const KEPT_APART_KEY = "stillwater.field-log.lure-twins-kept.v1";

function readKeptApart(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEPT_APART_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

/** Lure names that look like one lure typed two ways, each with a button to fold one into the other or keep both. */
function LureTwins() {
  const { storedBook, changeBook } = useLogbook();
  const { items, replaceTackle, updateTackle } = useTackle();
  const [kept, setKept] = useState(readKeptApart);
  const box = useRef<HTMLUListElement>(null);
  // Either way round: the pair stays apart when the other spelling later takes more fish.
  const keyOf = (pair: { from: string; into: string }) => [pair.from.toLowerCase(), pair.into.toLowerCase()].sort().join("|");
  // Skipped inside the pairing, so a pair kept apart doesn't hide another real slip of either name.
  // The angler's own spellings: the game's lure names are its own and not slips to merge, and the sample week's fish are made up.
  const twins = nearTwinLures(lureTally({ ...storedBook, catches: storedBook.catches.filter(ownFish) }, Number.MAX_SAFE_INTEGER), (from, into) =>
    // The plain "from|into" key, either way round as the counts may have flipped, is how the first build kept a pair apart.
    [keyOf({ from, into }), `${from.toLowerCase()}|${into.toLowerCase()}`, `${into.toLowerCase()}|${from.toLowerCase()}`].some((key) => kept.includes(key)),
  ).filter(
    // Close as stored but not as shown (a sample lure in Polish) would read as two unrelated names.
    (pair) => (t(pair.from) === pair.from) === (t(pair.into) === pair.into),
  );
  if (twins.length === 0) return null;
  // The line goes once settled: focus moves on to the next pair's first button, or to the lure record below.
  const focusNext = (index: number) => {
    const list = box.current;
    setTimeout(() => {
      const rows = list?.querySelectorAll<HTMLLIElement>("li") ?? [];
      const next = (rows[index] ?? rows[index - 1])?.querySelector<HTMLButtonElement>("button");
      if (next?.isConnected) next.focus();
      // No record when no lure went on a past outing's list: the past outings' heading below.
      else (document.querySelector<HTMLElement>("#lure-record") ?? document.querySelector<HTMLElement>("#gear-recent"))?.focus();
    }, 0);
  };
  const keepApart = (pair: { from: string; into: string }, index: number) => {
    const next = [...kept, keyOf(pair)];
    setKept(next);
    try {
      localStorage.setItem(KEPT_APART_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked: hidden for this visit only.
    }
    focusNext(index);
  };
  return (
    <ul ref={box} className="lure-twins">
      {twins.map((pair, index) => (
        <li key={pair.from} className="meta">
          {t("“{from}” looks like “{into}”.", { from: t(pair.from), into: t(pair.into) })}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const result = renameInBook(storedBook, "lure", pair.from, pair.into);
              if (!result.ok) return;
              // The packed lists take the merged name too, or the lure record would call the old one a blank; Undo puts
              // them back with the book.
              const lists = renamedTackle(items, pair.from, result.name);
              const before = items;
              // Only the merge is taken back: what was packed since stays.
              if (!changeBook("rename", result.book, lists ? () => updateTackle((current) => undoneTackle(current, before, lists)) : undefined)) return;
              if (lists) replaceTackle(lists);
              focusNext(index);
            }}
          >
            {t("Merge into {into}", { into: t(pair.into) })}
          </button>{" "}
          <button type="button" className="text-button" onClick={() => keepApart(pair, index)}>
            {t("They're different")}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The past outings' lists left open, for this visit: Back from an outing opened from one finds it still open. */
let openPast = new Set<string>();

/** A past outing's list, folded away: it matters again only when the same bag goes out. */
function PastTripTackle({ trip, today, tomorrow, open, onToggle }: { trip: Trip; today: string; tomorrow: string; open: boolean; onToggle: (open: boolean) => void }) {
  const { book } = useLogbook();
  useT();
  const spot = spotById(book, trip.spotId);
  // Once for the line and the list: each look-up sorts the whole book.
  const fish = catchesForTrip(book, trip.id);

  // A folded list is drawn once opened: a page of past outings would otherwise build every bag unseen.
  return (
    <details className="tackle-trip tackle-past" open={open} onToggle={(event) => event.currentTarget.open !== open && onToggle(event.currentTarget.open)}>
      <summary>
        <span className="tackle-past-title">{outingName(trip, book.spots)}</span>
        <span className="meta">
          {tripWhen(trip.date, today, tomorrow)}
          {spot && spot.name !== outingName(trip, book.spots) ? ` · ${spot.name}` : ""}
          {` · ${fishCountLabel(fish.length)}`}
        </span>
      </summary>
      <p className="tackle-past-link">
        <Link to={`/trips/${trip.id}`}>{t("Open the outing")}</Link>
      </p>
      {open ? <TackleList tripId={trip.id} name={t("Tackle for {trip}", { trip: outingName(trip, book.spots) })} caught={fish} trips={book.trips} spots={book.spots} /> : null}
    </details>
  );
}

export function GearPage() {
  const { book } = useLogbook();
  useT();
  const { tripId } = useParams();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  // Kept for the visit as well as here, so a list left open is open again on coming Back.
  const [openIds, keepOpenIds] = useState(() => new Set(openPast));
  const setOpenIds = (next: Set<string> | ((current: Set<string>) => Set<string>)) =>
    keepOpenIds((current) => {
      openPast = typeof next === "function" ? next(current) : next;
      return openPast;
    });

  if (tripId) {
    const trip = tripById(book, tripId);
    if (!trip) {
      return (
        <div className="sheet">
          <h1>{t("Missing outing")}</h1>
          <p className="lede">{t("That trip is not in this book.")}</p>
          <Link to="/gear">{t("Back to tackle")}</Link>
        </div>
      );
    }
    const spot = spotById(book, trip.spotId);
    return (
      <div className="sheet">
        <header className="sheet-head">
          <div>
            <p className="eyebrow">
              <Link to="/gear">{t("Tackle")}</Link>
              {" · "}
              {tripWhen(trip.date, today, tomorrow)}
            </p>
            <h1>{outingName(trip, book.spots)}</h1>
            <p className="meta stand">
              <time dateTime={trip.date}>{formatDay(trip.date)}</time>
              {spot ? (
                <>
                  {" · "}
                  <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
                  {" · "}
                  {t(WATER_LABELS[spot.waterType])}
                </>
              ) : null}
            </p>
          </div>
          <Link to={`/trips/${trip.id}`}>{t("Outing")}</Link>
        </header>
        <TackleList
          tripId={trip.id}
          heading={t("In the bag")}
          suggest={packingTips(book, trip, today)}
          trips={book.trips}
          spots={book.spots}
          caught={trip.date <= today ? catchesForTrip(book, trip.id) : undefined}
        />
      </div>
    );
  }

  const upcoming = upcomingRealTrips(book, today);
  // Real days out: a game day has nothing in the bag.
  // And not the sample week's once the angler has outings of their own, as Coming up and the record leave them out.
  const counted = countedBook(book);
  const recent = recentTrips(counted, today).filter(offPlayLake);
  const fishByTrip = fishCountsByTrip(counted);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Before you leave")}</p>
          <h1>{t("Tackle")}</h1>
          <p className="lede">{t("What goes in the bag for each outing. A check stays in this browser.")}</p>
        </div>
      </header>
      <h2 className="subhead">{t("Coming up")}</h2>
      {upcoming.length === 0 ? (
        <p className="empty">
          {t("No upcoming outings.")} <Link to="/trips/new">{t("Plan one")}</Link>
        </p>
      ) : (
        upcoming.map((trip) => <TripTackle key={trip.id} trip={trip} today={today} tomorrow={tomorrow} />)
      )}
      <LureRecord today={today} />
      <LureTwins />
      <div className="section-head">
        <h2 className="subhead" id="gear-recent" tabIndex={-1}>
          {t("Recent")}
        </h2>
        {/* Several bags opened to compare: one tap folds them away again. */}
        {openIds.size > 1 ? (
          <button
            type="button"
            className="text-button fold-all"
            onClick={() => {
              setOpenIds(new Set());
              // The button goes with the open lists: focus stays at the heading it sat beside.
              document.getElementById("gear-recent")?.focus();
            }}
          >
            {t("Fold all")}
          </button>
        ) : null}
      </div>
      {recent.length === 0 ? (
        <p className="empty">{t("No past outings.")}</p>
      ) : (
        <PagedTrips trips={recent} fishOn={(id) => fishByTrip.get(id) ?? 0}>
          {(trip) => (
            <PastTripTackle
              key={trip.id}
              trip={trip}
              today={today}
              tomorrow={tomorrow}
              open={openIds.has(trip.id)}
              onToggle={(open) =>
                setOpenIds((current) => {
                  const next = new Set(current);
                  if (open) next.add(trip.id);
                  else next.delete(trip.id);
                  return next;
                })
              }
            />
          )}
        </PagedTrips>
      )}
    </div>
  );
}
