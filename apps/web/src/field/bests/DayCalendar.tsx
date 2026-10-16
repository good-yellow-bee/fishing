import { Link } from "react-router-dom";
import type { Logbook } from "@stillwater/shared";
import { t, tn, useT } from "../../i18n";
import { formatDay } from "../format";
import { findLink } from "../findLinks";
import { monthName } from "../tripMonths";
import { dayMarks, markedMonths } from "./dayMarks";

/** How dark a fished day is: one fish, a few, or a good day. */
function level(fish: number): string {
  return fish >= 4 ? "3" : fish >= 2 ? "2" : "1";
}

/**
 * A season at a glance: each month with a day out, Monday first, each fished day shaded by its fish and opening them,
 * and an outing that landed nothing marked as a blank.
 */
export function DayCalendar({ book, year, today }: { book: Logbook; year: string; today: string }) {
  useT();
  const marks = dayMarks(book, year);
  const months = markedMonths(marks);
  if (months.length === 0) return null;
  return (
    <div className="day-calendar">
      {months.map((month) => {
        const [y, m] = month.split("-").map(Number) as [number, number];
        const first = new Date(y, m - 1, 1);
        const length = new Date(y, m, 0).getDate();
        // Blank cells before the 1st, so it lands under its weekday.
        const lead = (first.getDay() + 6) % 7;
        return (
          <section key={month} className="day-month" aria-label={monthName(month)}>
            <h3>{monthName(month)}</h3>
            <ol className="day-grid">
              {Array.from({ length: lead }, (_, index) => (
                <li key={`lead-${index}`} className="day-lead" aria-hidden="true" />
              ))}
              {Array.from({ length }, (_, index) => {
                const day = `${month}-${String(index + 1).padStart(2, "0")}`;
                const mark = marks.get(day);
                if (mark && mark.fish > 0) {
                  return (
                    <li key={day} className={`day-fish day-level-${level(mark.fish)}`}>
                      <Link to={findLink(day)} aria-label={`${formatDay(day)}: ${tn(mark.fish, "{n} fish", "{n} fish")}`} title={`${formatDay(day)}: ${tn(mark.fish, "{n} fish", "{n} fish")}`} />
                    </li>
                  );
                }
                if (mark?.outing && day <= today) {
                  return <li key={day} className="day-blank" aria-label={`${formatDay(day)}: ${t("an outing with no fish")}`} title={`${formatDay(day)}: ${t("an outing with no fish")}`} />;
                }
                return <li key={day} aria-hidden="true" className={mark?.outing ? "day-planned" : undefined} />;
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
