import { MOON_LABELS, WATER_LABELS, localDate, moonName, moonPhase, measureOf, personalBests, type CatchEntry, type Logbook, type Spot, type Trip } from "@stillwater/shared";
import { lureNames, pieceTally } from "./pieceTally";
import { formatCoord } from "./map/places";
import { osmLink } from "./osmLink";
import { t, tn } from "../i18n";
import { measureText, measuresText, weatherText } from "../i18n/content";
import { fishCountLabel, fishSum, formatDatedDay, formatDay, formatTimeOfDay, noteText, outingName } from "./format";
import { bookFishDay, daysOut } from "./tripMonths";
import { parseExactTerm } from "./findLinks";
import { splitLeftOut } from "./CatchSearch";
import { kindNames, speciesCounts, speciesWaters } from "./speciesLink";
import { goalPace } from "./YearGoal";
import { sheetOutings } from "./catchCsv";
import { outingDay, plainName, sameName } from "./tripDates";
import { pieceName } from "./gear/pieceKey";

/**
 * An outing as plain text to paste into a message: the day, the water, then each fish in the order it came.
 * A fish from another water than the outing's names its own; the day carries its year, as the text may be read years on.
 */
/** `all` is the book's fish its kinds and lures are named by, as the book writes them most. */
export function tripSummary(trip: Trip, spotName: string | null, catches: readonly CatchEntry[], waterOf: (spotId: string) => string | null = () => null, all: readonly CatchEntry[] = catches): string {
  // An outing saved without a title, which keeps its water's name for one, starts at its day.
  const title = trip.title.trim();
  const water = spotName === null ? null : plainName(spotName);
  const head = [water && sameName(title, water) ? "" : title, formatDatedDay(new Date(`${trip.date}T12:00:00`)), ...(water ? [water] : [])].filter(Boolean).join(" · ");
  const kindName = kindNames(all);
  const lureName = lureNames(all);
  const fish = [...catches]
    .sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))
    .map((entry) => {
      const elsewhere = entry.spotId !== trip.spotId ? waterOf(entry.spotId) : null;
      // A night session's fish after midnight say their own day, so the list doesn't seem to run back to the evening.
      const day = localDate(new Date(entry.caughtAt));
      // Past New Year it carries its year, as the outing's day above does.
      const shown = day.slice(0, 4) === trip.date.slice(0, 4) ? formatDay(day) : formatDatedDay(new Date(`${day}T12:00:00`));
      const when = day === trip.date ? formatTimeOfDay(entry.caughtAt) : `${shown}, ${formatTimeOfDay(entry.caughtAt)}`;
      const parts = [`${when} ${kindName(entry.species)}`, measuresText(entry), lureName(entry.lure), ...(elsewhere ? [elsewhere] : []), ...(entry.released ? [t("Released")] : [])];
      return `- ${parts.join(", ")}`;
    });
  const counts = [
    ...(trip.lost ? [`${t("Lost fish")}: ${trip.lost}`] : []),
    ...(trip.missed ? [`${t("Missed strikes")}: ${trip.missed}`] : []),
    // As the outing's page says it: how many of the fish hooked came in.
    ...(trip.lost && catches.length > 0 ? [t("Landed {landed} of {hooked} hooked.", { landed: catches.length, hooked: catches.length + trip.lost })] : []),
  ];
  // "0 fish" above a lost fish's line; "Nothing logged" only for a day with nothing at all to say.
  return [head, counts.length ? fishSum(catches.length) : fishCountLabel(catches.length), ...(counts.length ? [counts.join(" · ")] : []), ...fish, ...(trip.note.trim() ? ["", trip.note.trim()] : [])].join("\n");
}

/** One fish as plain text: what it was, its size and lure, then when and where, and its note. */
export function catchSummary(entry: CatchEntry, spotName: string | null, outing: string | null = null, all: readonly CatchEntry[] = [entry]): string {
  const what = [kindNames(all)(entry.species), measuresText(entry), lureNames(all)(entry.lure), ...(entry.released ? [t("Released")] : [])].join(", ");
  const when = [`${formatDatedDay(new Date(entry.caughtAt))} ${formatTimeOfDay(entry.caughtAt)}`, ...(spotName ? [spotName] : [])].join(" · ");
  // The conditions as the page shows them, so a pasted fish reads whole: the weather, the moon and its outing.
  const at = new Date(entry.caughtAt);
  const conditions = [...(entry.weather ? [weatherText(entry.weather)] : []), t(MOON_LABELS[moonName(moonPhase(at))]), ...(outing ? [`${t("Outing:")} ${outing}`] : [])].join(" · ");
  const note = noteText(entry.note).trim();
  return [what, when, conditions, ...(note ? ["", note] : [])].join("\n");
}

/**
 * A water as plain text: its kind, how its outings have gone, its best outing, the lures that took the most, and its notes.
 * `average` and `best` are the lines the spot page shows, so the two say the same thing.
 */
export function spotSummary(
  spot: Spot,
  outings: number,
  catches: readonly CatchEntry[],
  average: string | null,
  best: { trip: Trip; fish: number } | null,
  /** "Last fished here: Fri, Oct 16 · 3 fish", as the page's line says it. */
  last: string | null = null,
): string {
  const lures = pieceTally(catches, 3)
    .map((row) => `${pieceName(row.lure)} (${row.count})`)
    .join(", ");
  return [
    `${plainName(spot.name)} · ${t(WATER_LABELS[spot.waterType])}`,
    // Where it is, for "meet me here": the numbers and a map that opens on any phone.
    ...(spot.place ? [`${formatCoord(spot.place.lat, spot.place.lng)} · ${osmLink(spot.place.lat, spot.place.lng)}`] : []),
    // Beside its outings, a count: "2 outings · 0 fish", not "Nothing logged" when two were.
    `${tn(outings, "{n} outing", "{n} outings")} · ${outings > 0 ? tn(catches.length, "{n} fish", "{n} fish") : fishCountLabel(catches.length)}`,
    ...(average ? [average] : []),
    ...(last ? [last] : []),
    ...(best ? [`${t("Best outing here:")} ${outingName(best.trip, [spot])} · ${formatDatedDay(new Date(`${best.trip.date}T12:00:00`))}, ${fishCountLabel(best.fish)}`] : []),
    ...(lures ? [t("Lures that took the most: {lures}", { lures })] : []),
    ...(spot.bestConditions.trim() ? [t("Best conditions: {conditions}", { conditions: spot.bestConditions.trim() })] : []),
    ...(spot.notes.trim() ? ["", spot.notes.trim()] : []),
  ].join("\n");
}

/**
 * One kind of fish as plain text: how many and how many went back, its longest and heaviest,
 * its first and newest day, the waters that gave it, and the lures that took it.
 * `catches` are newest first, as the species page has them. `dayOf` gives the day a fish counts on (a night session's
 * small hours on its outing's), so the copy dates them as the page does; without it, the clock's day.
 */
export function speciesSummary(
  species: string,
  catches: readonly CatchEntry[],
  waters: ReadonlyArray<{ name: string | null; count: number }>,
  dayOf: (entry: CatchEntry) => string = (entry) => localDate(new Date(entry.caughtAt)),
): string {
  const dated = (entry: CatchEntry) => formatDatedDay(new Date(`${dayOf(entry)}T12:00:00`));
  const released = catches.filter((entry) => entry.released).length;
  const bests = personalBests({ spots: [], trips: [], catches: [...catches] });
  const sizes = [
    ...(bests.longest ? [t("Longest: {size}", { size: measureText(measureOf(bests.longest, "length")!) })] : []),
    ...(bests.heaviest ? [t("Heaviest: {size}", { size: measureText(measureOf(bests.heaviest, "weight")!) })] : []),
  ];
  const first = catches[catches.length - 1];
  const newest = catches[0];
  const named = waters.filter((row) => row.name).map((row) => `${plainName(row.name!)} (${row.count})`);
  const lures = pieceTally(catches, 3)
    .map((row) => `${pieceName(row.lure)} (${row.count})`)
    .join(", ");
  return [
    kindNames(catches)(species),
    [fishCountLabel(catches.length), ...(released > 0 ? [tn(released, "{n} released", "{n} released")] : [])].join(" · "),
    ...(sizes.length > 0 ? [sizes.join(" · ")] : []),
    ...(first && newest && catches.length > 1
      ? [`${t("First in the book")} ${dated(first)} · ${t("newest")} ${dated(newest)}`]
      : []),
    ...(named.length > 0 ? [t("Waters: {waters}", { waters: named.join(", ") })] : []),
    ...(lures ? [t("Lures that took the most: {lures}", { lures })] : []),
  ].join("\n");
}

/**
 * A year in the book as plain text: its fish and kinds, the days out and the goal,
 * its longest and heaviest, and the waters and lures that gave the most.
 */
export function yearSummary(book: Logbook, year: string, today: string, goal: number | null): string {
  const catches = book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${year}-`));
  // Last evening's outing, still going in the small hours, is no finished day out yet, as the page counts it.
  const days = daysOut(book, year, outingDay(today));
  // The outings fished that year, as the outings sheet lists them: the number anglers set season against season.
  const outings = sheetOutings(book, outingDay(today)).trips.filter((trip) => trip.date.startsWith(`${year}-`)).length;
  const bests = personalBests({ ...book, catches });
  // One kind written two ways under the name the book gives it most: "Zander", not "Zander ".
  const kindName = kindNames(catches);
  const best = (entry: CatchEntry | null | undefined, kind: "length" | "weight") =>
    entry
      ? [t(kind === "length" ? "Longest: {species}, {size}" : "Heaviest: {species}, {size}", { species: kindName(entry.species), size: measureText(measureOf(entry, kind)!) })]
      : [];
  const waters = speciesWaters(book, catches)
    .filter((row) => row.name)
    .slice(0, 3)
    .map((row) => `${plainName(row.name!)} (${row.count})`);
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const pace = goal !== null && today.startsWith(`${year}-`) ? goalPace(catches.length, goal, new Date(y, m - 1, d)) : null;
  const lures = pieceTally(catches, 3)
    .map((row) => `${pieceName(row.lure)} (${row.count})`)
    .join(", ");
  return [
    t("{year} in the book", { year }),
    `${fishCountLabel(catches.length)} · ${tn(speciesCounts(catches).length, "{n} species", "{n} species")}`,
    ...(days > 0 ? [t("Days on the water in {year}: {count}", { year, count: days })] : []),
    ...(outings > 0 ? [t("Outings: {count}", { count: outings })] : []),
    ...(goal !== null
      ? // A line of the copied text, as the open goal's is: without the box's full stop.
        [catches.length >= goal ? t("Goal reached: {count} of {goal} fish in {year}.", { count: catches.length, goal, year }).replace(/\.$/, "") : t("{count} of {goal} fish in {year}", { count: catches.length, goal, year })]
      : []),
    // A year still under way, short of its goal: where its pace ends it, as the goal on Bests says.
    ...(pace ? [t("On pace for {pace} by the year's end", { pace: pace.pace })] : []),
    ...best(bests.longest, "length"),
    ...best(bests.heaviest, "weight"),
    ...(waters.length > 0 ? [t("Waters: {waters}", { waters: waters.join(", ") })] : []),
    ...(lures ? [t("Lures that took the most: {lures}", { lures })] : []),
  ].join("\n");
}

/**
 * A search as a reader would say it, from its parts as the search split them: a term a link typed in
 * ("species:\"Pike\"") is just its name, anything typed by hand sits in quotes, and the parts keep their "+".
 */
function searchLabel(parts: readonly string[]): string {
  const { keep, drop } = splitLeftOut(parts);
  const said = (part: string) => parseExactTerm(part)?.name ?? t("“{query}”", { query: part });
  // What the angler left out reads after a minus; what a count's link leaves out for itself (the game's lake, the
  // sample week) is no part of the search as they would say it.
  const left = drop.filter((part) => !parseExactTerm(part) && part.trim().toLowerCase() !== t("sample|search word").toLowerCase());
  return [keep.map(said).join(" + "), ...left.map((part) => `− ${said(part)}`)].filter(Boolean).join(" ");
}

/**
 * The fish a search found, as plain text: what was searched, how many, then each fish oldest first
 * with its day, kind, size, lure and water.
 */
/** `largest`: the list was shown largest first, so the copy keeps that order and says so. */
export function searchSummary(parts: readonly string[], matches: readonly CatchEntry[], waterOf: (spotId: string) => string | null, largest = false, all: readonly CatchEntry[] = matches): string {
  const kindName = kindNames(all);
  const lureName = lureNames(all);
  const fish = (largest ? [...matches] : [...matches].sort((a, b) => a.caughtAt.localeCompare(b.caughtAt)))
    .map((entry) => {
      const water = waterOf(entry.spotId);
      // With its time, so a night session's small hours read as such under the day search that found them.
      const bits = [`${formatDatedDay(new Date(entry.caughtAt))} ${formatTimeOfDay(entry.caughtAt)} ${kindName(entry.species)}`, measuresText(entry), lureName(entry.lure), ...(water ? [water] : []), ...(entry.released ? [t("Released")] : [])];
      return `- ${bits.join(", ")}`;
    });
  return [searchLabel(parts), largest ? `${fishCountLabel(matches.length)} · ${t("Largest first")}` : fishCountLabel(matches.length), ...fish].join("\n");
}
