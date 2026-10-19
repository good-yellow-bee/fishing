import { useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { Logbook } from "@stillwater/shared";
import { locale, t, tn, useT } from "../../i18n";
import { formatDay } from "../format";
import { findLink } from "../findLinks";
import { FROM_LIST } from "../leaveDeleted";
import { monthName } from "../tripMonths";
import { dayMarks, markedMonths } from "./dayMarks";

/** The weekdays' first letters in the reader's language, Monday first: "M T W T F S S", "P W Ś C P S N". */
function weekdayLetters(): string[] {
  const held = letters.get(locale());
  if (held) return held;
  const format = new Intl.DateTimeFormat(locale(), { weekday: "narrow" });
  // 2026-10-12 was a Monday.
  const made = Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 9, 12 + index, 12)));
  letters.set(locale(), made);
  return made;
}
const letters = new Map<string, string[]>();

/** How dark a fished day is: one fish, a few, or a good day. */
function level(fish: number): string {
  return fish >= 4 ? "3" : fish >= 2 ? "2" : "1";
}

/**
 * Where an arrow key moves among the days that open something, oldest first: left and right a day that opens
 * something, up and down the nearest such day a week or more away, Home and End the ends. Null for any other key.
 */
export function stepDay(days: readonly string[], from: string, key: string): string | null {
  const at = days.indexOf(from);
  if (at < 0 || days.length === 0) return null;
  const shift = (day: string, by: number) => {
    const [y, m, d] = day.split("-").map(Number) as [number, number, number];
    const date = new Date(y, m - 1, d + by, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  switch (key) {
    case "ArrowLeft":
      return days[Math.max(0, at - 1)]!;
    case "ArrowRight":
      return days[Math.min(days.length - 1, at + 1)]!;
    case "ArrowUp": {
      const back = shift(from, -7);
      return [...days].reverse().find((day) => day <= back) ?? days[0]!;
    }
    case "ArrowDown": {
      const ahead = shift(from, 7);
      return days.find((day) => day >= ahead) ?? days[days.length - 1]!;
    }
    case "Home":
      return days[0]!;
    case "End":
      return days[days.length - 1]!;
    default:
      return null;
  }
}

/**
 * A season at a glance: each month with a day out, Monday first, each fished day shaded by its fish and opening them,
 * and an outing that landed nothing marked as a blank that opens it.
 */
/** `tail` adds to each day's search what the marks left out. */
/** The month with the most days out, when more than one month is shown and one of them leads the rest; else null. */
export function busiestMonth(days: readonly (readonly [string, number])[]): string | null {
  if (days.length < 2) return null;
  const top = Math.max(...days.map(([, count]) => count));
  const leaders = days.filter(([, count]) => count === top);
  return top > 0 && leaders.length === 1 ? leaders[0]![0] : null;
}

/** `tripTail` turns a day into the trip search for its outings, leaving out those the calendar doesn't count. */
export function DayCalendar({
  book,
  year,
  today,
  tail = (term) => term,
  tripTail = (day) => day,
}: {
  book: Logbook;
  year: string;
  today: string;
  tail?: (term: string) => string;
  tripTail?: (day: string) => string;
}) {
  useT();
  const marks = dayMarks(book, year);
  const months = markedMonths(marks);
  const box = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<string | null>(null);
  if (months.length === 0) return null;
  // The days that open something, oldest first. The calendar is one tab stop: the arrow keys walk these days.
  const linked = [...marks.entries()]
    .filter(([, mark]) => mark.fish > 0 || mark.trips.length > 0)
    .map(([day]) => day)
    .sort();
  const active = current && linked.includes(current) ? current : linked[0];
  const monthFish = (month: string) => [...marks.entries()].reduce((sum, [day, mark]) => (day.startsWith(`${month}-`) ? sum + mark.fish : sum), 0);
  // The month's days out, as the shaded and outlined days show them: a fish, or an outing already past.
  const monthDays = (month: string) => [...marks.entries()].filter(([day, mark]) => day.startsWith(`${month}-`) && (mark.fish > 0 || (mark.trips.length > 0 && day < today))).length;
  // The month with the most days out, once one leads the others.
  const busiest = busiestMonth(months.map((month) => [month, monthDays(month)] as const));
  // Today's own day says so, so the season reads against the date.
  const dayName = (day: string) => (day === today ? t("{day}, today", { day: formatDay(day) }) : formatDay(day));
  const todayMark = (day: string) => (day === today ? ({ "aria-current": "date" } as const) : {});
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = (event.target as HTMLElement).dataset.day;
    if (!from) return;
    const to = stepDay(linked, from, event.key);
    if (!to) return;
    event.preventDefault();
    setCurrent(to);
    box.current?.querySelector<HTMLElement>(`[data-day="${to}"]`)?.focus();
  };
  const dayLink = (day: string) => ({ "data-day": day, "aria-describedby": "day-calendar-keys", tabIndex: day === active ? 0 : -1, onFocus: () => setCurrent(day) });
  return (
    <div className="day-calendar" ref={box} onKeyDown={onKeyDown}>
      <p id="day-calendar-keys" className="sr-only">
        {t("Arrow keys move between the days.")}
      </p>
      {months.map((month) => {
        const [y, m] = month.split("-").map(Number) as [number, number];
        const first = new Date(y, m - 1, 1);
        const length = new Date(y, m, 0).getDate();
        // Blank cells before the 1st, so it lands under its weekday.
        const lead = (first.getDay() + 6) % 7;
        return (
          // Unnamed, so a season's twelve months aren't twelve landmarks; each one's heading says which it is.
          <section key={month} className="day-month">
            <h3>
              {monthName(month)}
              {/* The month's days out and fish at a glance, counted as its days are. */}
              {/* Each opens what it counts, as the counts on Home and Bests do: the month's outings, and its fish. */}
              {monthDays(month) > 0 ? (
                <small className="day-month-days">
                  {" · "}
                  <Link to={`/trips?${new URLSearchParams({ find: tripTail(month) }).toString()}`} aria-label={t("{month}: {count}", { month: monthName(month), count: tn(monthDays(month), "{n} day out", "{n} days out") })}>
                    {tn(monthDays(month), "{n} day out", "{n} days out")}
                  </Link>
                </small>
              ) : null}
              {monthFish(month) > 0 ? (
                <small className="day-month-fish">
                  {" · "}
                  <Link to={findLink(tail(month))} aria-label={t("{month}: {count}", { month: monthName(month), count: tn(monthFish(month), "{n} fish", "{n} fish") })}>
                    {tn(monthFish(month), "{n} fish", "{n} fish")}
                  </Link>
                </small>
              ) : null}
              {month === busiest ? <small className="day-month-best">{` · ${t("Busiest month")}`}</small> : null}
            </h3>
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
                  // A day whose fish include some from after midnight opens their outing when it holds just those;
                  // otherwise the day's search, which files the small hours on their outing's day as this count does.
                  const label = `${dayName(day)}: ${tn(mark.fish, "{n} fish", "{n} fish")}`;
                  return (
                    <li key={day} className={`day-fish day-level-${level(mark.fish)}${day === today ? " day-today" : ""}`}>
                      <Link to={mark.lateTrip ? `/trips/${mark.lateTrip}` : findLink(tail(day))} state={mark.lateTrip ? FROM_LIST : undefined} aria-label={label} title={label} {...dayLink(day)} {...todayMark(day)} />
                    </li>
                  );
                }
                if (mark && mark.trips.length > 0 && day < today) {
                  // The blank opens its outing, or the day's outings when there were several.
                  const label = `${dayName(day)}: ${tn(mark.trips.length, "an outing with no fish", "{n} outings with no fish")}`;
                  return (
                    <li key={day} className={`day-blank${day === today ? " day-today" : ""}`}>
                      <Link to={mark.trips.length === 1 ? `/trips/${mark.trips[0]}` : `/trips?${new URLSearchParams({ find: tripTail(day) }).toString()}`} state={mark.trips.length === 1 ? FROM_LIST : undefined} aria-label={label} title={label} {...dayLink(day)} {...todayMark(day)} />
                    </li>
                  );
                }
                if (mark && mark.trips.length > 0) {
                  // An outing still ahead (or today's, before its first fish) opens its plan.
                  const label = `${dayName(day)}: ${tn(mark.trips.length, "an outing ahead", "{n} outings ahead")}`;
                  return (
                    <li key={day} className={`day-planned${day === today ? " day-today" : ""}`}>
                      <Link to={mark.trips.length === 1 ? `/trips/${mark.trips[0]}` : `/trips?${new URLSearchParams({ find: tripTail(day) }).toString()}`} state={mark.trips.length === 1 ? FROM_LIST : undefined} aria-label={label} title={label} {...dayLink(day)} {...todayMark(day)} />
                    </li>
                  );
                }
                // A day with nothing on it still shows when it is today, for the eye; there is nothing to open.
                return <li key={day} className={day === today ? "day-today" : undefined} aria-hidden="true" />;
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
