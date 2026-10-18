import { Link } from "react-router-dom";
import type { CatchEntry } from "@stillwater/shared";
import { t } from "../../i18n";
import { fishCountLabel } from "../format";
import { findLink } from "../findLinks";
import { catchMonth, monthName } from "../tripMonths";

/** How many seasons the table sets side by side, newest kept: more would not fit a phone. */
export const TABLE_YEARS = 4;

/** Fish per month (rows, January first) and year (columns, oldest first) over the newest TABLE_YEARS years with fish. */
export function monthYearCounts(catches: readonly CatchEntry[], monthOf: (entry: CatchEntry) => string = catchMonth): { years: string[]; counts: Map<string, number> } {
  const counts = new Map<string, number>();
  for (const entry of catches) {
    if (Number.isNaN(new Date(entry.caughtAt).getTime())) continue;
    const month = monthOf(entry);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  const years = [...new Set([...counts.keys()].map((month) => month.slice(0, 4)))].sort().slice(-TABLE_YEARS);
  return { years, counts };
}

/** The same month set against itself across the years, as a table a screen reader can walk; each count opens its fish. */
/** `tail` adds to each month's search what the counts left out. */
export function MonthYearTable({
  catches,
  today = new Date(),
  tail = (term) => term,
  monthOf = catchMonth,
}: {
  catches: readonly CatchEntry[];
  today?: Date;
  tail?: (term: string) => string;
  monthOf?: (entry: CatchEntry) => string;
}) {
  const { years, counts } = monthYearCounts(catches, monthOf);
  // Months still to come are left blank, not counted as none.
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (years.length < 2) return null;
  return (
    <section>
      <div className="section-head">
        <h2>{t("Month by month, year by year")}</h2>
      </div>
      <div className="month-year-wrap">
        <table className="month-year">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{t("Month")}</span>
              </th>
              {years.map((year) => (
                <th key={year} scope="col">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, index) => {
              const mm = String(index + 1).padStart(2, "0");
              return (
                <tr key={mm}>
                  <th scope="row">{monthName(`2026-${mm}`).split(" ")[0]}</th>
                  {years.map((year) => {
                    const month = `${year}-${mm}`;
                    const count = counts.get(month) ?? 0;
                    if (count === 0 && month > thisMonth) return <td key={year} />;
                    return (
                      <td key={year}>
                        {count > 0 ? (
                          <Link to={findLink(tail(month))} aria-label={`${monthName(month)}: ${fishCountLabel(count)}`}>
                            {count}
                          </Link>
                        ) : (
                          <>
                            <span aria-hidden="true">–</span>
                            <span className="sr-only">{t("None")}</span>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
