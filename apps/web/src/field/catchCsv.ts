import { catchesNewestFirst, spotById, tripById, SKY_LABELS, WIND_LABELS, type Logbook } from "@stillwater/shared";
import { getLang, getUnits, num, t } from "../i18n";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";
import { noteText } from "./format";

/** One cell, quoted when it holds the separator, a quote or a line break. */
function cell(value: string, separator: string) {
  return value.includes(separator) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
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
    t("Note"),
  ];
  const rows = catchesNewestFirst(book).map((entry) => {
    const at = new Date(entry.caughtAt);
    const { measure, weather } = entry;
    return [
      `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
      `${pad(at.getHours())}:${pad(at.getMinutes())}`,
      t(entry.species),
      measure.kind === "length" ? num(metric ? measure.inches * CM_PER_IN : measure.inches) : "",
      measure.kind === "weight" ? num(metric ? measure.pounds * KG_PER_LB : measure.pounds, 2) : "",
      t(entry.lure),
      spotById(book, entry.spotId)?.name ?? "",
      entry.tripId ? (tripById(book, entry.tripId)?.title ?? "") : "",
      weather ? t(SKY_LABELS[weather.sky]) : "",
      weather ? t(WIND_LABELS[weather.wind]) : "",
      weather ? num(metric ? ((weather.waterTempF - 32) * 5) / 9 : weather.waterTempF) : "",
      noteText(entry.note),
    ];
  });
  // A byte-order mark tells spreadsheet programs the file is UTF-8, so Polish letters survive.
  return "﻿" + [header, ...rows].map((row) => row.map((value) => cell(value, separator)).join(separator)).join("\r\n") + "\r\n";
}
