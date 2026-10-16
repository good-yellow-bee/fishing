import type { CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { findLink, findWithLink } from "./findLinks";
import { TallyBars } from "./TallyBars";
import { catchMonth, monthName } from "./tripMonths";

/** Fish per month of the year, January first, every year together: when a kind or a water gives its fish. */
export function monthOfYearTally(catches: readonly CatchEntry[]): { month: number; count: number }[] {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const entry of catches) {
    if (Number.isNaN(new Date(entry.caughtAt).getTime())) continue;
    counts[Number(catchMonth(entry).slice(5)) - 1]! += 1;
  }
  return counts.map((count, index) => ({ month: index + 1, count }));
}

/** The month's own name ("October", "Październik"), which the search reads as every October in the book. */
function monthWord(month: number): string {
  return monthName(`2026-${String(month).padStart(2, "0")}`).split(" ")[0]!;
}

/** "Through the year", once fish came in more than one month; each month opens its fish, within a kind or water when given. */
export function MonthBars({ catches, within }: { catches: readonly CatchEntry[]; within?: string }) {
  const rows = monthOfYearTally(catches);
  if (rows.filter((row) => row.count > 0).length < 2) return null;
  const link = (text: string) => (within ? findWithLink(within, text) : findLink(text));
  return (
    <section>
      <div className="section-head">
        <h2>{t("Through the year")}</h2>
      </div>
      <TallyBars rows={rows.map((row) => ({ key: String(row.month), label: monthWord(row.month), count: row.count, to: row.count > 0 ? link(monthWord(row.month)) : undefined }))} />
    </section>
  );
}
