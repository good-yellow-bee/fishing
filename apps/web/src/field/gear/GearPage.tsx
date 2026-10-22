import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  WATER_LABELS,
  catchesForTrip,
  localDate,
  lureTally,
  measureOf,
  recentTrips,
  shiftDate,
  spotById,
  tripById,
  type Trip,
} from "@stillwater/shared";
import { fishCountLabel, formatDay, outingName, tripWhen, waterName } from "../format";
import { bookFishDay } from "../tripMonths";
import { useLogbook } from "../LogbookState";
import { TackleList, tipProps } from "./TackleList";
import { useTackle } from "./TackleState";
import { CopySummary } from "../CopySummary";
import { planText } from "../TripPages";
import { renamedTackle } from "./renamedTackle";
import { undoneTackle } from "./undoneTackle";
import { pieceRecords, type PieceRecord } from "./pieceRecord";
import { lureRecordCsv } from "./lureCsv";
import { datedName, downloadFile } from "../download";
import { fileSlug } from "../gpx";
import { ChoiceRow } from "../ChoiceRow";
import { pieceName, shownPieceKey } from "./pieceKey";
import { inReadersOrder, notYetThisYear } from "../bests/notYet";
import { exactTerm, findLink } from "../findLinks";
import { packingTipRows } from "../waterTips";
import { nearTwinLures } from "../suggestions";
import { renameInBook } from "../bookRename";
import { PagedTrips } from "../PagedTrips";
import { countedSearch } from "../countedSearch";
import { locale, t, tn, useT } from "../../i18n";
import { measureText } from "../../i18n/content";
import { offPlayLake } from "../playLake";
import { countedBook, ownFish } from "../milestones";
import { isSampleOnly, nextRealTrips, upcomingRealTrips } from "../bookCopy";
import { outingCatches, outingFish, underWayOn } from "../outingFish";
import { bestLure } from "../waterLure";
import { lateOutings, outingDay, outNow, plainName, sameName } from "../tripDates";
import { focusPageHeading } from "../pageFocus";
import { bookLureName, onPiece } from "../pieceTally";
import { newestOutingFirst } from "../catchNeighbors";
import { kindNames, mostWritten } from "../speciesLink";
import { foldName, twinName, twinNamesAmong } from "../spotOrder";

function TripTackle({ trip, today, tomorrow }: { trip: Trip; today: string; tomorrow: string }) {
  const { book } = useLogbook();
  const { items } = useTackle();
  useT();
  const spot = spotById(book, trip.spotId);
  // Today's outing out now, as Home's Next says it: of a dawn and a dusk with a fish loose on their water, either.
  const out = outNow(book, trip);
  const going = trip.date === today && out;
  // Under way once anything bit, as the outing's own page and Trips take it: a fish, a lost one or a miss; or out now.
  const underWayNow = underWayOn(trip, outingFish(book)) || going;

  return (
    <section className="tackle-trip">
      <div className="section-head">
        {/* Under "Coming up". */}
        <h3 className="tackle-trip-title">
          <Link to={`/trips/${trip.id}`}>{outingName(trip, book.spots)}</Link>
        </h3>
        <span className="meta">
          {going ? t("Out now") : tripWhen(trip.date, today, tomorrow, out)}
          {spot && !sameName(spot.name, outingName(trip, book.spots)) ? ` · ${waterName(spot.name)}` : ""}
        </span>
      </div>
      <TackleList
        tripId={trip.id}
        name={t("Tackle for {trip}", { trip: outingName(trip, book.spots) })}
        {...tipProps(packingTipRows(book, trip, today))}
        trips={book.trips} catches={book.catches}
        spots={book.spots}
        // Today's outing may already have fish, counted against the pieces as on the outing's page.
        caught={trip.date <= today ? catchesForTrip(book, trip.id) : undefined}
      />
      {/* The plan and what is still to pack, for whoever is coming along: until the outing is under way or out now, as Home offers it. */}
      {underWayNow ? null : <CopySummary text={() => planText(book, trip, items)} file="stillwater-plan.txt" label={t("Copy the plan")} copied={t("Plan copied.")} saved={t("Plan saved as a file.")} />}
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
  // One water's record: a pike lake and a trout stream want different bags. Offered among the waters the angler packed
  // for, once there are two; the sample's only while the book has nothing of the angler's own, as the record counts.
  const counted = countedBook(book);
  const packedFor = new Set(items.map((item) => item.tripId));
  // Waters that read the same, as a search takes them; two with no name are two waters, as on Bests and in searches.
  const oneWater = (a: { id: string; name: string }, b: { id: string; name: string }) => a.id === b.id || (!!foldName(a.name) && twinName(a.name, b.name));
  // A water and any that read the same: its links search the name, which opens both.
  const bookAt = (spotId: string) => {
    const at = book.spots.find((spot) => spot.id === spotId) ?? { id: spotId, name: "" };
    const here = new Set(book.spots.filter((spot) => oneWater(spot, at)).map((spot) => spot.id));
    return { ...book, trips: book.trips.filter((trip) => here.has(trip.spotId)), catches: book.catches.filter((entry) => here.has(entry.spotId)) };
  };
  // Only a water with a record of its own: one picked never empties the record and takes its choice with it. Waters
  // that read the same are one choice, as their record is one.
  const waters = counted.spots
    .filter((spot) => counted.trips.some((trip) => trip.spotId === spot.id && trip.date <= today && packedFor.has(trip.id)) && pieceRecords(bookAt(spot.id), items, today).length > 0)
    .filter((spot, index, all) => all.findIndex((other) => oneWater(other, spot)) === index);
  // Two waters with no name read alike among the choices: each says how many fish it holds, as the water pickers do.
  const twinNames = twinNamesAmong(waters);
  const choiceName = (spot: { id: string; name: string }) =>
    twinNames.has(foldName(spot.name)) ? `${waterName(spot.name)} · ${tn(book.catches.filter((entry) => entry.spotId === spot.id).length, "{n} fish", "{n} fish")}` : waterName(spot.name);

  const [waterId, setWaterId] = useState("all");
  const water = waters.find((spot) => spot.id === waterId) ?? null;
  // A water with no name has no search of its own: its lures and fish there are named, not linked.
  const searchable = !water || !!foldName(water.name);
  const atWater = water ? bookAt(water.id) : book;
  // The order picked holds while its control shows.
  const found = pieceRecords(atWater, items, today);
  const records = orderedRecords(found, found.length > 2 ? order : "most");
  // A kind and a lure as the book writes them most, as Bests and the cards name them, whichever water is picked.
  const kindName = useMemo(() => kindNames(countedBook(book).catches), [book]);
  const lureName = bookLureName(book.catches);
  // With all waters shown, where a lure took most of its fish, once one water clearly led among two or more: where to
  // pack it for. Waters that read the same are one, under the name most of its fish were logged at. Waters with no name
  // count apart, each its own water; one leading says nothing, as its fish have no search to open.
  const nameOf = new Map(book.spots.map((spot) => [spot.id, spot.name]));
  const bestWater = (lure: string) => {
    const byWater = new Map<string, Map<string, number>>();
    for (const entry of counted.catches) {
      const name = nameOf.get(entry.spotId);
      if (name === undefined || !onPiece(entry, lure)) continue;
      const key = foldName(name) || `\u0000${entry.spotId}`;
      const names = byWater.get(key) ?? new Map<string, number>();
      names.set(plainName(name), (names.get(plainName(name)) ?? 0) + 1);
      byWater.set(key, names);
    }
    const [top, next] = [...byWater.values()]
      .map((names) => ({ name: mostWritten(names), count: [...names.values()].reduce((sum, n) => sum + n, 0) }))
      .sort((a, b) => b.count - a.count);
    return top && top.name && byWater.size > 1 && top.count >= 2 && top.count > (next?.count ?? 0) ? top : null;
  };
  // Each row's best water worked out once, with all waters shown.
  const mostAt = new Map(water ? [] : records.flatMap((row) => (row.lure ? [[row.label, bestWater(row.lure)] as const] : [])).filter(([, best]) => best !== null));
  // The book the record counts: the sample week's made-up lures go with the first outing of the angler's own.
  // This year as the book counts it: during a New Year's Eve session past midnight, still the old one.
  const quiet = notYetThisYear(countedBook(atWater).catches, new Date(`${outingDay(today)}T12:00:00`), (entry) => entry.lure, (entry) => bookFishDay(book, entry), (name) => shownPieceKey(name));
  const [all, setAll] = useState(false);
  // A lure that took fish goes straight into the next outing's bag, unless it is already there.
  // Only for an outing on the water picked: another water's lures are no tip for it.
  const coming = nextRealTrips(book, today)[0];
  // At the water picked or a twin of it, as its record counts them.
  const next = coming && (!water || oneWater(water, book.spots.find((spot) => spot.id === coming.spotId) ?? { id: coming.spotId, name: "" })) ? coming : undefined;
  const onNext = new Set(next ? items.filter((item) => item.tripId === next.id).map((item) => shownPieceKey(item.label)) : []);
  const [justPacked, setJustPacked] = useState<string | null>(null);
  // The button goes once the lure is on the list: focus moves to the line saying so.
  const focusPacked = useRef(false);
  // The record's best lures not yet on that list, packed in one go: with All waters, those of the outing's own water
  // first, then the rest, so a pike lake's outing isn't offered another water's perch spinner first.
  const ranked = next && !water ? [...orderedRecords(pieceRecords(bookAt(next.spotId), items, today), "most"), ...orderedRecords(found, "most")] : orderedRecords(found, "most");
  const best = next ? ranked.filter((row, index) => row.fish > 0 && !onNext.has(shownPieceKey(row.label)) && ranked.findIndex((other) => shownPieceKey(other.label) === shownPieceKey(row.label)) === index).slice(0, 3) : [];
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
      {waters.length >= 2 ? (
        <div className="spot-order">
          <ChoiceRow<string>
            wrap
            label={t("Water")}
            value={water ? water.id : "all"}
            options={[{ id: "all", label: t("All waters") }, ...waters.map((spot) => ({ id: spot.id, label: choiceName(spot) }))]}
            onChange={setWaterId}
          />
        </div>
      ) : null}
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
            {/* With a water picked, its fish there. */}
            {row.lure && searchable ? <Link to={findLink(countedSearch(book, [exactTerm("lure", lureName(row.name)), ...(water ? [exactTerm("water", plainName(water.name))] : [])].join(" + "), atWater.catches.filter((entry) => onPiece(entry, row.lure!))))}>{lureName(row.name)}</Link> : <span>{lureName(row.name)}</span>}
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
                        {t("Largest: {species}, {size}", { species: kindName(row.largest.entry.species), size: measureText(measureOf(row.largest.entry, row.largest.by)!) })}
                      </Link>
                    </span>
                  ) : null}
                </>
              ) : null}
              {/* Where it took most, opening its fish there. */}
              {mostAt.get(row.label) ? (
                <span className="lure-last">
                  <Link to={findLink(countedSearch(book, `${exactTerm("lure", lureName(row.name))} + ${exactTerm("water", mostAt.get(row.label)!.name)}`, book.catches.filter((entry) => onPiece(entry, row.lure!)), "book"))}>
                    {t("most at {water} ({count})", { water: mostAt.get(row.label)!.name, count: mostAt.get(row.label)!.count })}
                  </Link>
                </span>
              ) : null}
              {/* A lure that never took a fish: when it last went out, so an old one can come off the list. */}
              {!row.lastAt && row.lastPacked ? <span className="lure-last">{t("last packed {day}", { day: formatDay(row.lastPacked) })}</span> : null}
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
                      // The book's own spelling, as its fish were logged: the button shows it in the reader's language.
                      if (add(next.id, row.name) !== null) return;
                      focusPacked.current = true;
                      setJustPacked(row.label);
                    }}
                  >
                    {t("Pack for {outing}", { outing: outingName(next, book.spots) })}
                    {/* Which lure, for a list of buttons that would otherwise all read the same. */}
                    <span className="sr-only">: {lureName(row.name)}</span>
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
          {t("Packed: {lures}.", { lures: packedBest.map((label) => pieceName(label)).join(", ") })}
        </p>
      ) : next && best.length >= 2 ? (
        <p className="meta packed-best">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const packed = best.filter((row) => add(next.id, row.name) === null).map((row) => row.name);
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
          {t("Packed for {n} or more outings without a fish: {lures}.", { n: NEVER_TOOK_OUTINGS, lures: blanks.map((row) => `${lureName(row.name)} (${row.outings})`).join(", ") })}
        </p>
      ) : null}
      {/* Lures that took fish last year and none yet this year: worth a swim before the season ends. */}
      {quiet.length > 0 ? (
        <p className="meta not-yet">
          <span>
            {t("Not yet this year:")}{" "}
            {inReadersOrder(quiet, lureName).map((lure, index) => (
              <Fragment key={lure}>
                {index > 0 ? ", " : null}
                {/* Counted for the water picked, so each opens that water's fish on it. */}
                {searchable ? <Link to={findLink(countedSearch(book, [exactTerm("lure", lureName(lure)), ...(water ? [exactTerm("water", plainName(water.name))] : [])].join(" + "), atWater.catches.filter((entry) => onPiece(entry, lure))))}>{lureName(lure)}</Link> : lureName(lure)}
              </Fragment>
            ))}
          </span>
        </p>
      ) : null}
      {/* The whole record as shown, every row and in the order picked, for a notebook or a fishing partner. Not the
          sample week's alone: its invented lures are no record of the angler's, as the book file's sheets say too. */}
      {isSampleOnly(book) ? null : (
        <p className="search-save">
          <button
            type="button"
            className="text-button"
            onClick={() => downloadFile(lureRecordCsv(records, kindName, lureName), "text/csv;charset=utf-8", datedName(water ? `${fileSlug(water.name)}-lures.csv` : "stillwater-lures.csv"))}
          >
            {t("Download the lure record as a spreadsheet")}
          </button>
        </p>
      )}
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
/** `fishCount`: the outing's fish with those logged loose that day on its water, as the Trips page counts them. */
function PastTripTackle({ trip, today, tomorrow, fishCount, open, onToggle }: { trip: Trip; today: string; tomorrow: string; fishCount: number; open: boolean; onToggle: (open: boolean) => void }) {
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
          {tripWhen(trip.date, today, tomorrow, outNow(book, trip))}
          {spot && !sameName(spot.name, outingName(trip, book.spots)) ? ` · ${waterName(spot.name)}` : ""}
          {` · ${fishCountLabel(fishCount)}`}
        </span>
      </summary>
      <p className="tackle-past-link">
        <Link to={`/trips/${trip.id}`}>{t("Open the outing")}</Link>
      </p>
      {open ? <TackleList tripId={trip.id} name={t("Tackle for {trip}", { trip: outingName(trip, book.spots) })} caught={fish} trips={book.trips} catches={book.catches} spots={book.spots} /> : null}
    </details>
  );
}

export function GearPage() {
  const { book } = useLogbook();
  useT();
  const { tripId } = useParams();
  // Opened straight from an address, the shell's focus lands on the page itself: on to the heading, as the Map does.
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body || active.matches(".field-main")) focusPageHeading({ preventScroll: true });
  }, [tripId]);
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
              {tripWhen(trip.date, today, tomorrow, outNow(book, trip))}
            </p>
            <h1>{outingName(trip, book.spots)}</h1>
            <p className="meta stand">
              <time dateTime={trip.date}>{formatDay(trip.date)}</time>
              {spot ? (
                <>
                  {" · "}
                  <Link to={`/spots/${spot.id}`}>{waterName(spot.name)}</Link>
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
          {...tipProps(packingTipRows(book, trip, today))}
          trips={book.trips} catches={book.catches}
          spots={book.spots}
          caught={trip.date <= today ? catchesForTrip(book, trip.id) : undefined}
        />
      </div>
    );
  }

  // In the small hours, last evening's outings still going stay first under Coming up, their bags open, as Home and Trips.
  const going = lateOutings(book);
  const upcoming = [...going, ...upcomingRealTrips(book, today)];
  // Real days out: a game day has nothing in the bag.
  // And not the sample week's once the angler has outings of their own, as Coming up and the record leave them out.
  const counted = countedBook(book);
  const recent = recentTrips(counted, today).filter((trip) => offPlayLake(trip) && !going.includes(trip)).sort(newestOutingFirst(counted));
  // Each outing's fish with those logged loose that day on its water, as Trips and Home count them.
  const fishOf = outingCatches(book);
  const fishOn = (tripId: string) => fishOf(tripId).length;
  // Under each month, the lure that took most of its fish: what worked then, for a bag packed now.
  const lureName = bookLureName(book.catches);
  const monthLure = (trips: readonly Trip[]) => {
    const lure = bestLure(trips.flatMap((trip) => fishOf(trip.id)));
    return lure ? t("best on {lure}", { lure: lureName(lure) }) : null;
  };

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
        <PagedTrips trips={recent} fishOn={fishOn} note={monthLure}>
          {(trip) => (
            <PastTripTackle
              key={trip.id}
              trip={trip}
              today={today}
              tomorrow={tomorrow}
              fishCount={fishOn(trip.id)}
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
