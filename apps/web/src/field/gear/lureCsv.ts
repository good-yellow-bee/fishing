import { measureOf } from "@stillwater/shared";
import { getLang, locale, t } from "../../i18n";
import { measureText } from "../../i18n/content";
import { sheet } from "../catchCsv";
import type { PieceRecord } from "./pieceRecord";

/** Fish per outing to one decimal, as the record writes it: "0.8" (Polish "0,8"). */
const rate = (fish: number, outings: number) => (fish / outings).toLocaleString(locale(), { maximumFractionDigits: 1 });

/**
 * The lure record as a spreadsheet, rows in the order shown, in the reader's language and units: what took fish, how
 * often it went out, and its best, to take into a notebook or send to a fishing partner.
 */
export function lureRecordCsv(records: readonly PieceRecord[]): string {
  const separator = getLang() === "pl" ? ";" : ",";
  const header = [t("Lure or bait"), t("Fish"), t("Outings"), t("Fish an outing"), t("Last fish"), t("Largest")];
  const rows = records.map((row) => [
    t(row.label),
    String(row.fish),
    String(row.outings),
    rate(row.fish, row.outings),
    row.lastDay ?? "",
    row.largest ? `${t(row.largest.entry.species)}, ${measureText(measureOf(row.largest.entry, row.largest.by)!)}` : "",
  ]);
  return sheet([header, ...rows], separator);
}
