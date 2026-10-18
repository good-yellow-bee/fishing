import type { CatchEntry } from "@stillwater/shared";
import { Link } from "react-router-dom";
import { t } from "../i18n";
import { exactTerm, findLink, findWithLink } from "./findLinks";
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

/** The month's own name ("October", "Październik"); as an exact term the search reads it as every October in the book. */
function monthWord(month: number): string {
  return monthName(`2026-${String(month).padStart(2, "0")}`).split(" ")[0]!;
}

/** "Through the year", once fish came in more than one month; each month opens its fish, within a kind or water when given. */
export function MonthBars({ catches, within }: { catches: readonly CatchEntry[]; within?: string }) {
  const rows = monthOfYearTally(catches);
  if (rows.filter((row) => row.count > 0).length < 2) return null;
  const link = (text: string) => (within ? findWithLink(within, text) : findLink(text));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const most = Math.max(...rows.map((row) => row.count));
  const best = rows.filter((row) => row.count === most).length === 1 ? rows.find((row) => row.count === most)! : null;
  return (
    <section>
      <div className="section-head">
        <h2>{t("Through the year")}</h2>
      </div>
      <TallyBars rows={rows.map((row) => ({ key: String(row.month), label: monthWord(row.month), count: row.count, to: row.count > 0 ? link(exactTerm("month", monthWord(row.month))) : undefined }))} />
      {/* The month it gives most, once one stands clear of the rest. */}
      {best ? (
        <p className="meta">
          <Link to={link(exactTerm("month", monthWord(best.month)))}>{t("Best month: {month} ({count} of {total})", { month: monthWord(best.month), count: best.count, total })}</Link>
        </p>
      ) : null}
    </section>
  );
}
