import { Link } from "react-router-dom";
import type { Logbook } from "@stillwater/shared";
import { locale, t, tn, useT } from "../../i18n";
import { formatDay } from "../format";
import { findLink } from "../findLinks";
import { monthName } from "../tripMonths";
import { dayMarks, markedMonths } from "./dayMarks";

/** The weekdays' first letters in the reader's language, Monday first: "M T W T F S S", "P W Ś C P S N". */
function weekdayLetters(): string[] {
  // 2026-10-12 was a Monday.
  return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale(), { weekday: "narrow" }).format(new Date(2026, 9, 12 + index, 12)));
}

/** How dark a fished day is: one fish, a few, or a good day. */
function level(fish: number): string {
  return fish >= 4 ? "3" : fish >= 2 ? "2" : "1";
}

/**
 * A season at a glance: each month with a day out, Monday first, each fished day shaded by its fish and opening them,
 * and an outing that landed nothing marked as a blank that opens it.
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
            {/* Which column is which day, for the eye; each day's link already says its whole date. */}
            <div className="day-grid day-weekdays" aria-hidden="true">
              {weekdayLetters().map((letter, index) => (
                <span key={index}>{letter}</span>
              ))}
            </div>
            <ol className="day-grid">
              {Array.from({ length: lead }, (_, index) => (
                <li key={`lead-${index}`} className="day-lead" aria-hidden="true" />
              ))}
              {Array.from({ length }, (_, index) => {
                const day = `${month}-${String(index + 1).padStart(2, "0")}`;
                const mark = marks.get(day);
                if (mark && mark.fish > 0) {
                  // A day whose fish include some from after midnight opens their outing, since a search by day
                  // would miss those; several outings' fish fall back to the day's search.
                  const label = `${formatDay(day)}: ${tn(mark.fish, "{n} fish", "{n} fish")}`;
                  return (
                    <li key={day} className={`day-fish day-level-${level(mark.fish)}`}>
                      <Link to={mark.lateTrip ? `/trips/${mark.lateTrip}` : findLink(day)} aria-label={label} title={label} />
                    </li>
                  );
                }
                if (mark && mark.trips.length > 0 && day < today) {
                  // The blank opens its outing, or the day's outings when there were several.
                  const label = `${formatDay(day)}: ${t("an outing with no fish")}`;
                  return (
                    <li key={day} className="day-blank">
                      <Link to={mark.trips.length === 1 ? `/trips/${mark.trips[0]}` : `/trips?find=${day}`} aria-label={label} title={label} />
                    </li>
                  );
                }
                return <li key={day} aria-hidden="true" className={mark && mark.trips.length > 0 ? "day-planned" : undefined} />;
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
