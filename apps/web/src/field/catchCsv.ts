import { catchesNewestFirst, measuresOf, spotById, tripById, SKY_LABELS, WIND_LABELS, type Logbook } from "@stillwater/shared";
import { getLang, getUnits, num, t } from "../i18n";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";
import { noteText } from "./format";
import { countedBook } from "./milestones";

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
  const rows = catchesNewestFirst(book).map((entry) => {
    const at = new Date(entry.caughtAt);
    const { weather } = entry;
    // A fish both measured and weighed fills both columns.
    const length = measuresOf(entry).find((one) => one.kind === "length");
    const weight = measuresOf(entry).find((one) => one.kind === "weight");
    return [
      `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
      `${pad(at.getHours())}:${pad(at.getMinutes())}`,
      t(entry.species),
      length ? num(metric ? length.inches * CM_PER_IN : length.inches) : "",
      weight ? num(metric ? weight.pounds * KG_PER_LB : weight.pounds, 2) : "",
      t(entry.lure),
      spotById(book, entry.spotId)?.name ?? "",
      entry.tripId ? (tripById(book, entry.tripId)?.title ?? "") : "",
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
function sheet(rows: string[][], separator: string): string {
  return "﻿" + rows.map((row) => row.map((value) => cell(value, separator)).join(separator)).join("\r\n") + "\r\n";
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

/** The outings as a spreadsheet file, newest first: the day, the water, the fish landed, and the fish lost and strikes missed. */
export function tripsCsv(whole: Logbook, today: string): string {
  const book = sheetOutings(whole, today);
  const separator = getLang() === "pl" ? ";" : ",";
  const header = [t("Date"), t("Trip"), t("Water"), t("Fish"), t("Lost fish"), t("Missed strikes"), t("Note")];
  const fish = new Map<string, number>();
  for (const entry of book.catches) if (entry.tripId) fish.set(entry.tripId, (fish.get(entry.tripId) ?? 0) + 1);
  const rows = [...book.trips]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((trip) => [trip.date, trip.title, spotById(book, trip.spotId)?.name ?? "", String(fish.get(trip.id) ?? 0), String(trip.lost ?? 0), String(trip.missed ?? 0), noteText(trip.note)]);
  return sheet([header, ...rows], separator);
}
