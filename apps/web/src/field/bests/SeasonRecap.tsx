import type { Logbook } from "@stillwater/shared";
import { t, useT } from "../../i18n";
import { CopySummary } from "../CopySummary";
import { yearSummary } from "../summaries";
import { seasonRecap } from "./seasonRecap";
import { newWatersThisYear } from "./notYet";
import { bookFishDay } from "../tripMonths";

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
  if (recap.fish === 0 && recap.days === 0) return null;
  // A season still going is set against the one before up to the same day.
  // The waters that gave their first fish that season.
  const newWaters = newWatersThisYear(book.catches, new Date(Number(year), 6, 1), (entry) => bookFishDay(book, entry)).flatMap((id) => book.spots.filter((spot) => spot.id === id).map((spot) => spot.name));
  const before = recap.beforeUntil ? t("{year} by this date", { year: recap.before }) : recap.before;
  const lines = [
    t("Fish: {count}", { count: against(recap.fish, recap.fishBefore, before) }),
    t("Days out: {count}", { count: against(recap.days, recap.daysBefore, before) }),
    t("Kinds: {count}", { count: against(recap.kinds, recap.kindsBefore, before) }),
    ...(recap.newKinds.length > 0 ? [t("New to the book: {kinds}", { kinds: recap.newKinds.map((name) => t(name)).join(", ") })] : []),
    ...(newWaters.length > 0 ? [t("New waters: {waters}", { waters: newWaters.join(", ") })] : []),
  ];
  return (
    <aside className="conditions season-recap" aria-label={t("{year} in the book", { year })}>
      <span className="eyebrow">{t("{year} in the book", { year })}</span>
      <p>
        {lines.map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
      <CopySummary text={() => [yearSummary(book, year, today, null), ...lines.slice(3)].join("\n")} file="stillwater-season.txt" />
    </aside>
  );
}
