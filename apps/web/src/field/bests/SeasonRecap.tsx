import type { Logbook } from "@stillwater/shared";
import { Link } from "react-router-dom";
import { t, tn, useT } from "../../i18n";
import { CopySummary } from "../CopySummary";
import { yearSummary } from "../summaries";
import { readYearGoal } from "../YearGoal";
import { seasonRecap } from "./seasonRecap";
import { newWatersThisYear } from "./notYet";
import { bestFishDay, bookFishDay } from "../tripMonths";
import { formatDay } from "../format";

/** "42, 8 more than 2025": a season's count against the one before, when the one before had any. */
function against(count: number, before: number, year: string): string {
  if (before === 0) return String(count);
  if (count === before) return t("{count}, as many as {year}", { count, year });
  return count > before
    ? t("{count}, {n} more than {year}", { count, n: count - before, year })
    : t("{count}, {n} fewer than {year}", { count, n: before - count, year });
}

/** A season's best day (worth a line once it had more than one fish) and what was new to the book in it. */
function seasonFirsts(book: Logbook, year: string, today: string) {
  // A night session's small hours count on its outing's day.
  const top = bestFishDay({ ...book, catches: book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${year}-`)) });
  const bestDay = top && top.count > 1 ? [t("Best day: {day} · {fish}", { day: formatDay(top.date), fish: tn(top.count, "{n} fish", "{n} fish") })] : [];
  // The waters that gave their first fish that season.
  const newWaters = newWatersThisYear(book.catches, new Date(Number(year), 6, 1), (entry) => bookFishDay(book, entry)).flatMap((id) => book.spots.filter((spot) => spot.id === id).map((spot) => spot.name));
  const recap = seasonRecap(book, year, today);
  const firsts = [
    ...bestDay,
    ...(recap.newKinds.length > 0 ? [t("New to the book: {kinds}", { kinds: recap.newKinds.map((name) => t(name)).join(", ") })] : []),
    ...(newWaters.length > 0 ? [t("New waters: {waters}", { waters: newWaters.join(", ") })] : []),
  ];
  return { top, bestDay, firsts };
}

/** "{year} in the book" as copied, the same from All time and from the season picked, with its goal and its firsts. */
export function seasonCopy(book: Logbook, year: string, today: string): string {
  const goal = readYearGoal(year);
  return [yearSummary(book, year, today, goal), ...seasonFirsts(book, year, today).firsts].join("\n");
}

/** A picked season at a glance against the one before: fish, days out, kinds, and the kinds new to the book. */
/** `fishLink` and `daysLink` open the season's fish and outings; `kindsId` is the heading of the page's kinds, jumped to. */
export function SeasonRecapBox({
  book,
  year,
  today,
  dayLink,
  fishLink,
  daysLink,
  kindsId,
}: {
  book: Logbook;
  year: string;
  today: string;
  dayLink?: (date: string) => string;
  fishLink?: string;
  daysLink?: string;
  kindsId?: string;
}) {
  useT();
  const recap = seasonRecap(book, year, today);
  const goal = year < today.slice(0, 4) ? readYearGoal(year) : null;
  if (recap.fish === 0 && recap.days === 0) return null;
  // A season still going is set against the one before up to the same day.
  const before = recap.beforeUntil ? t("{year} by this date", { year: recap.before }) : recap.before;
  const fishLine = t("Fish: {count}", { count: against(recap.fish, recap.fishBefore, before) });
  const daysLine = t("Days out: {count}", { count: against(recap.days, recap.daysBefore, before) });
  const kindsLine = t("Kinds: {count}", { count: against(recap.kinds, recap.kindsBefore, before) });
  const lines = [
    fishLine,
    daysLine,
    kindsLine,
    // A past season's goal, how it ended; this year's has its own box below.
    ...(goal !== null ? [recap.fish >= goal ? t("Goal reached: {count} of {goal} fish in {year}.", { count: recap.fish, goal, year }) : t("{count} of {goal} fish in {year}", { count: recap.fish, goal, year })] : []),
  ];
  const { top, bestDay, firsts } = seasonFirsts(book, year, today);
  return (
    <aside className="conditions season-recap" aria-label={t("{year} in the book", { year })}>
      <span className="eyebrow">{t("{year} in the book", { year })}</span>
      <p>
        {[...lines, ...firsts].map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {/* The best day opens its fish, as the Best day tile does. */}
            {top && dayLink && line === bestDay[0] ? (
              <Link to={dayLink(top.date)}>{line}</Link>
            ) : line === fishLine && fishLink && recap.fish > 0 ? (
              // The season's counts open what they count: its fish, its outings, its kinds further down.
              <Link to={fishLink}>{line}</Link>
            ) : line === daysLine && daysLink && recap.days > 0 ? (
              <Link to={daysLink}>{line}</Link>
            ) : line === kindsLine && kindsId && recap.kinds > 0 ? (
              <a
                href={`#${kindsId}`}
                onClick={(event) => {
                  event.preventDefault();
                  const heading = document.getElementById(kindsId);
                  heading?.scrollIntoView({ block: "start" });
                  heading?.focus({ preventScroll: true });
                }}
              >
                {line}
              </a>
            ) : (
              line
            )}
          </span>
        ))}
      </p>
      {/* The copy carries this season's goal too, which its own box below shows on the page. */}
      <CopySummary text={() => seasonCopy(book, year, today)} file="stillwater-season.txt" />
    </aside>
  );
}
