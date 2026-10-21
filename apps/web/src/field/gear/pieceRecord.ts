import { isLureLabel, personalBests, type CatchEntry, type Logbook, type TackleItem } from "@stillwater/shared";
import { shownPieceKey } from "./pieceKey";
import { countedFish } from "../milestones";
import { isSampleCatch, isSampleOuting } from "../bookCopy";
import { PLAY_LAKE_ID } from "../playLake";
import { bookFishDay } from "../tripMonths";
import { gaveWay, stillGoing } from "../tripDates";
import { pieceTally } from "../pieceTally";
import { outingFish } from "../outingFish";

/**
 * `lure`: the name the fish were logged under, for opening them; `lastAt`: when the newest of them was caught, and
 * `lastDay` the day it counts on (a night session's small hours on its outing's); `since`: the outings it went on after that day. All three set when the piece took any. `largest`: its biggest fish, by
 * weight when any was weighed, else by length, once it took two or more.
 */
/** `label` is the piece as its list wrote it, what Pack adds; `name` as most of its fish were logged, what the record shows. */
export type PieceRecord = { label: string; name: string; outings: number; lastPacked?: string; fish: number; lure?: string; lastAt?: string; lastDay?: string; since?: number; largest?: { entry: CatchEntry; by: "weight" | "length" } };

/**
 * Each lure packed for outings up to `today`: how many lists it was on, and the fish in the book logged under any
 * spelling of it; `lure` is the commonest spelling, which its search link opens. Tools and line are left out. Most fish first, then most outings.
 */
export function pieceRecords(book: Logbook, items: readonly TackleItem[], today: string): PieceRecord[] {
  // The sample week's made-up bags count only while the book has no outings of the angler's own, as its fish do.
  // Own outings already fished: not the game's, and not one still only planned.
  const ownTrips = book.trips.filter((trip) => !isSampleOuting(trip) && trip.spotId !== PLAY_LAKE_ID && trip.date <= today);
  // The same switch countedBook makes: once the angler has a fish or an outing of their own, even one only planned,
  // the sample's go, so none of its made-up lures is offered for packing onto a real outing.
  const ownFish = book.catches.some((entry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID);
  const ownAny = ownFish || book.trips.some((trip) => !isSampleOuting(trip) && trip.spotId !== PLAY_LAKE_ID);
  const trips = ownAny ? ownTrips : book.trips;
  // Today's outing counts once it has a fish: packed this morning, it hasn't yet gone without one. A fish logged loose
  // on its water counts for the day's one outing there, as Trips and the Recent list count it.
  const fishOn = outingFish(book);
  // Not last evening's outing still going in the small hours, until its first fish: it may bring one yet. One that gave
  // way to today's plan is over, as Recent lists it.
  const past = new Set(
    trips.filter((trip) => (trip.date < today && (!stillGoing(book, trip) || gaveWay(book, trip) || fishOn(trip.id) > 0)) || (trip.date === today && fishOn(trip.id) > 0)).map((trip) => trip.id),
  );
  const dateOf = new Map(book.trips.map((trip) => [trip.id, trip.date]));
  // The fish make the same switch as the bags: a sample fish never counts against an outing of the angler's own.
  const own = ownAny ? book.catches.filter((entry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID) : countedFish(book.catches);
  // Pieces match as they read, as the outing's list matches them: "Rosówka" packed is the "Nightcrawler" the fish were logged under.
  const readKey = (label: string) => shownPieceKey(label);
  const byPiece = new Map<string, { label: string; trips: Set<string>; lastPacked: string }>();
  for (const item of items) {
    if (!past.has(item.tripId) || !isLureLabel(item.label)) continue;
    const key = readKey(item.label);
    const row = byPiece.get(key) ?? { label: item.label.trim(), trips: new Set<string>(), lastPacked: "" };
    row.trips.add(item.tripId);
    // Only a ticked one went in the bag.
    const day = dateOf.get(item.tripId) ?? "";
    if (item.packed && day > row.lastPacked) row.lastPacked = day;
    byPiece.set(key, row);
  }
  // The angler's own fish by piece, then by spelling, in one pass: a round of the game with the same lure neither adds
  // to its record nor ends a dry run.
  const fishByPiece = new Map<string, Map<string, CatchEntry[]>>();
  for (const entry of own) {
    const key = readKey(entry.lure);
    if (!byPiece.has(key)) continue;
    const spellings = fishByPiece.get(key) ?? new Map<string, CatchEntry[]>();
    fishByPiece.set(key, spellings);
    const name = entry.lure.trim().toLowerCase().replace(/\s+/g, " ");
    const list = spellings.get(name);
    if (list) list.push(entry);
    else spellings.set(name, [entry]);
  }
  return [...byPiece.entries()]
    .map(([key, row]) => {
      // The spelling most of its fish were logged under, and those fish: what the lure's search link opens.
      const spellings = fishByPiece.get(key) ?? new Map<string, CatchEntry[]>();
      const took = [...spellings.values()].sort((a, b) => b.length - a.length)[0] ?? [];
      // The newest fish under any spelling of the piece: "Spinnerbaits" last week still counts for "Spinnerbait".
      const all = [...spellings.values()].flat();
      const newest = all.reduce<CatchEntry | undefined>((found, entry) => (!found || Date.parse(entry.caughtAt) > Date.parse(found.caughtAt) ? entry : found), undefined);
      const lastAt = newest?.caughtAt;
      const lastDay = newest ? bookFishDay(book, newest) : "";
      // Counted as the outings are: today's once it has a fish, since until then it may still bring one.
      const since = [...row.trips].filter((id) => past.has(id) && (dateOf.get(id) ?? "") > lastDay).length;
      // Across every spelling, as "last fish" is: one fish is its own biggest and says nothing.
      const bests = all.length >= 2 ? personalBests({ spots: [], trips: [], catches: all }) : null;
      const largest = bests?.heaviest ? { entry: bests.heaviest, by: "weight" as const } : bests?.longest ? { entry: bests.longest, by: "length" as const } : undefined;
      // Every spelling's fish, as its last fish and its largest count them, so the row agrees with itself.
      // Shown as most of its fish were logged ("Spinner"), not as the first list wrote it ("spinners").
      return { label: row.label, name: pieceTally(all, 1)[0]?.lure ?? row.label, outings: row.trips.size, ...(row.lastPacked ? { lastPacked: row.lastPacked } : {}), fish: all.length, ...(took[0] && lastAt ? { lure: took[0].lure, lastAt, lastDay, since } : {}), ...(largest ? { largest } : {}) };
    })
    .sort((a, b) => b.fish - a.fish || b.outings - a.outings || a.label.localeCompare(b.label));
}
