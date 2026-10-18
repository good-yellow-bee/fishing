import type { Logbook } from "@stillwater/shared";
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

/** A picked season at a glance against the one before: fish, days out, kinds, and the kinds new to the book. */
export function SeasonRecapBox({ book, year, today }: { book: Logbook; year: string; today: string }) {
  useT();
  const recap = seasonRecap(book, year, today);
  const goal = year < today.slice(0, 4) ? readYearGoal(year) : null;
  if (recap.fish === 0 && recap.days === 0) return null;
  // A season still going is set against the one before up to the same day.
  // The waters that gave their first fish that season.
  const newWaters = newWatersThisYear(book.catches, new Date(Number(year), 6, 1), (entry) => bookFishDay(book, entry)).flatMap((id) => book.spots.filter((spot) => spot.id === id).map((spot) => spot.name));
  const before = recap.beforeUntil ? t("{year} by this date", { year: recap.before }) : recap.before;
  const lines = [
    t("Fish: {count}", { count: against(recap.fish, recap.fishBefore, before) }),
    t("Days out: {count}", { count: against(recap.days, recap.daysBefore, before) }),
    t("Kinds: {count}", { count: against(recap.kinds, recap.kindsBefore, before) }),
    // A past season's goal, how it ended; this year's has its own box below.
    ...(goal !== null ? [recap.fish >= goal ? t("Goal reached: {count} of {goal} fish in {year}.", { count: recap.fish, goal, year }) : t("{count} of {goal} fish in {year}", { count: recap.fish, goal, year })] : []),
  ];
  // The season's best day, a night session's small hours on its outing's day; worth a line once it had more than one fish.
  const top = bestFishDay({ ...book, catches: book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${year}-`)) });
  const bestDay = top && top.count > 1 ? [t("Best day: {day} · {fish}", { day: formatDay(top.date), fish: tn(top.count, "{n} fish", "{n} fish") })] : [];
  const firsts = [
    ...bestDay,
    ...(recap.newKinds.length > 0 ? [t("New to the book: {kinds}", { kinds: recap.newKinds.map((name) => t(name)).join(", ") })] : []),
    ...(newWaters.length > 0 ? [t("New waters: {waters}", { waters: newWaters.join(", ") })] : []),
  ];
  return (
    <aside className="conditions season-recap" aria-label={t("{year} in the book", { year })}>
      <span className="eyebrow">{t("{year} in the book", { year })}</span>
      <p>
        {[...lines, ...firsts].map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
      {/* The copy carries this season's goal too, which its own box below shows on the page. */}
      <CopySummary text={() => [yearSummary(book, year, today, goal ?? (year === today.slice(0, 4) ? readYearGoal(year) : null)), ...firsts].join("\n")} file="stillwater-season.txt" />
    </aside>
  );
}
