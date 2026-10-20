import { catchesNewestFirst, measuresOf, spotById, SKY_LABELS, WIND_LABELS, type Logbook } from "@stillwater/shared";
import { getLang, getUnits, num, t } from "../i18n";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";
import { lureNames } from "./pieceTally";
import { plainName } from "./tripDates";
import { newestOutingFirst } from "./catchNeighbors";
import { noteText, outingName, outingNameById } from "./format";
import { countedBook } from "./milestones";
import { bookFishDay } from "./tripMonths";
import { kindNames } from "./speciesLink";

/**
 * One cell, quoted when it holds the separator, a quote or a line break. Text a spreadsheet would read as a formula
 * ("=…", "-weed edge") gets a leading apostrophe so it stays text; a plain number such as "-3" is left alone.
 */
export function cell(value: string, separator: string) {
  const safe = /^[=+\-@\t\r]/.test(value) && !/^-\d+([.,]\d+)?$/.test(value) ? `'${value}` : value;
  return safe.includes(separator) || /["\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** A water temperature as a cell: one that rounds to nothing is 0, never "-0". */
const waterTemp = (value: number) => num(Math.round(value * 10) / 10 || 0);

/**
 * The catches as a spreadsheet file, newest first, in the reader's language
 * and units. Polish spreadsheets split on semicolons and write decimal commas,
 * so a Polish reader gets those; English gets commas and points.
 */
export function catchesCsv(book: Logbook): string {
  const separator = getLang() === "pl" ? ";" : ",";
  const metric = getUnits() === "metric";
  const header = [
    t("Date"),
    t("Time"),
    // A night session's small hours are filed on their outing's day, as Bests and the calendar count them.
    t("Outing day"),
    t("Species"),
    `${t("Length")} (${metric ? "cm" : "in"})`,
    `${t("Weight")} (${metric ? "kg" : "lb"})`,
    t("Lure or bait"),
    t("Water"),
    t("Trip"),
    t("Sky"),
    t("Wind"),
    metric ? t("Water °C") : t("Water °F"),
    t("Released"),
    t("Note"),
  ];
  // One kind written two ways is one kind, under the name the book gives it most.
  const kindName = kindNames(book.catches);
  const lureName = lureNames(book.catches);
  const rows = catchesNewestFirst(book).map((entry) => {
    const at = new Date(entry.caughtAt);
    const { weather } = entry;
    // A fish both measured and weighed fills both columns.
    const length = measuresOf(entry).find((one) => one.kind === "length");
    const weight = measuresOf(entry).find((one) => one.kind === "weight");
    return [
      `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
      `${pad(at.getHours())}:${pad(at.getMinutes())}`,
      bookFishDay(book, entry) === `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` ? "" : bookFishDay(book, entry),
      kindName(entry.species),
      length ? num(metric ? length.inches * CM_PER_IN : length.inches) : "",
      weight ? num(metric ? weight.pounds * KG_PER_LB : weight.pounds, 2) : "",
      lureName(entry.lure),
      plainName(spotById(book, entry.spotId)?.name ?? ""),
      // An untitled outing by its water, as the outings sheet names it, so the two sheets join on it.
      entry.tripId ? (outingNameById(book, entry.tripId) ?? "") : "",
      weather ? t(SKY_LABELS[weather.sky]) : "",
      weather ? t(WIND_LABELS[weather.wind]) : "",
      weather?.waterTempF === undefined ? "" : waterTemp(metric ? ((weather.waterTempF - 32) * 5) / 9 : weather.waterTempF),
      entry.released ? t("Yes") : "",
      noteText(entry.note),
    ];
  });
  return sheet([header, ...rows], separator);
}

/** The rows as a file: a byte-order mark tells spreadsheet programs it is UTF-8, so Polish letters survive. */
export function sheet(rows: string[][], separator: string): string {
  return "\uFEFF" + rows.map((row) => row.map((value) => cell(value, separator)).join(separator)).join("\r\n") + "\r\n";
}

/**
 * The outings a spreadsheet holds: the angler's own up to today, as the counts on the page take them. Not the game's
 * rounds, not the sample week once there is an outing or a fish of their own, and not a planned day (today's included
 * until its first fish), which would read as a blank one.
 */
export function sheetOutings(book: Logbook, today: string): Logbook {
  const counted = countedBook(book);
  // Today's outing once it has a fish: before that it is still ahead, as the calendar and the averages take it.
  const fished = new Set(counted.catches.map((entry) => entry.tripId));
  return { ...counted, trips: counted.trips.filter((trip) => trip.date < today || (trip.date === today && fished.has(trip.id))) };
}

/**
 * The outings as a spreadsheet file, newest first: the day, the water, the fish landed, and the fish lost and strikes missed.
 * A fish logged without an outing counts for that day's outing on its water, as the Trips page and Bests count it.
 */
export function tripsCsv(whole: Logbook, today: string): string {
  const book = sheetOutings(whole, today);
  const separator = getLang() === "pl" ? ";" : ",";
  const header = [t("Date"), t("Trip"), t("Water"), t("Fish"), t("Kinds"), t("Lures"), t("Lost fish"), t("Missed strikes"), t("Note")];
  const fish = new Map<string, number>();
  // What each outing took, most first, in the sheet's language: "Zander ×2, Northern pike".
  const kinds = new Map<string, Map<string, number>>();
  const kindName = kindNames(book.catches);
  // And on what, the same way, a piece however it was typed: "Spinner ×3, Jig".
  const lures = new Map<string, Map<string, number>>();
  const lureName = lureNames(book.catches);
  const onDay = new Map<string, string[]>();
  for (const trip of countedBook(whole).trips) onDay.set(`${trip.date} ${trip.spotId}`, [...(onDay.get(`${trip.date} ${trip.spotId}`) ?? []), trip.id]);
  const tripIds = new Set(book.trips.map((trip) => trip.id));
  for (const entry of book.catches) {
    // Only to the day's one outing there: of a dawn and a dusk, a loose fish is neither's until filed, as Trips counts it.
    const day = onDay.get(`${bookFishDay(book, entry)} ${entry.spotId}`) ?? [];
    const ids = entry.tripId ? [entry.tripId] : day.length === 1 ? day : [];
    for (const id of ids) {
      if (!tripIds.has(id)) continue;
      fish.set(id, (fish.get(id) ?? 0) + 1);
      const tally = kinds.get(id) ?? new Map<string, number>();
      const name = kindName(entry.species);
      tally.set(name, (tally.get(name) ?? 0) + 1);
      kinds.set(id, tally);
      const lure = lureName(entry.lure);
      if (lure) {
        const used = lures.get(id) ?? new Map<string, number>();
        used.set(lure, (used.get(lure) ?? 0) + 1);
        lures.set(id, used);
      }
    }
  }
  const tallyOf = (tallies: Map<string, Map<string, number>>, tripId: string) =>
    [...(tallies.get(tripId) ?? new Map<string, number>())]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
      .join(", ");
  const rows = [...book.trips]
    // Newest first, a day's dusk before its dawn, as Trips lists them.
    .sort(newestOutingFirst(whole))
    // An untitled outing goes by its water's name, as the list names it.
    .map((trip) => [trip.date, plainName(outingName(trip, book.spots)), plainName(spotById(book, trip.spotId)?.name ?? ""), String(fish.get(trip.id) ?? 0), tallyOf(kinds, trip.id), tallyOf(lures, trip.id), String(trip.lost ?? 0), String(trip.missed ?? 0), noteText(trip.note)]);
  return sheet([header, ...rows], separator);
}
