import { catchesNewestFirst, measuresOf, spotById, tripById, SKY_LABELS, WIND_LABELS, type Logbook } from "@stillwater/shared";
import { getLang, getUnits, num, t } from "../i18n";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";
import { noteText } from "./format";

/**
 * One cell, quoted when it holds the separator, a quote or a line break. Text a spreadsheet would read as a formula
 * ("=…", "-weed edge") gets a leading apostrophe so it stays text; a plain number such as "-3" is left alone.
 */
export function cell(value: string, separator: string) {
  const safe = /^[=+\-@\t\r]/.test(value) && !/^-\d+([.,]\d+)?$/.test(value) ? `'${value}` : value;
  return safe.includes(separator) || /["\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const pad = (value: number) => String(value).padStart(2, "0");

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
      weather?.waterTempF === undefined ? "" : num(metric ? ((weather.waterTempF - 32) * 5) / 9 : weather.waterTempF),
      entry.released ? t("Yes") : "",
      noteText(entry.note),
    ];
  });
  // A byte-order mark tells spreadsheet programs the file is UTF-8, so Polish letters survive.
  return "﻿" + [header, ...rows].map((row) => row.map((value) => cell(value, separator)).join(separator)).join("\r\n") + "\r\n";
}
