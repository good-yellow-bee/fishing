import { foldText, type Logbook } from "@stillwater/shared";
import { Link } from "react-router-dom";
import { locale, t, tn, useT } from "../../i18n";
import { CopySummary } from "../CopySummary";
import { yearSummary } from "../summaries";
import { readYearGoal } from "../YearGoal";
import { isSampleOnly } from "../bookCopy";
import { seasonRecap } from "./seasonRecap";
import { newWatersThisYear } from "./notYet";
import { bestFishDay, bookFishDay } from "../tripMonths";
import { formatDay } from "../format";
import { kindNames } from "../speciesLink";
import { pieceTally } from "../pieceTally";
import { pieceName } from "../gear/pieceKey";
import { countedFish } from "../milestones";
import { plainName } from "../tripDates";

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
  const newWaters = newWatersThisYear(book.catches, new Date(Number(year), 6, 1), (entry) => bookFishDay(book, entry)).flatMap((id) => book.spots.filter((spot) => spot.id === id).map((spot) => plainName(spot.name)));
  const recap = seasonRecap(book, year, today);
  const firsts = [
    ...bestDay,
    ...(recap.newKinds.length > 0 ? [t("New to the book: {kinds}", { kinds: recap.newKinds.map(kindNames(countedFish(book.catches))).join(", ") })] : []),
    ...(newWaters.length > 0 ? [t("New waters: {waters}", { waters: newWaters.join(", ") })] : []),
  ];
  return { top, bestDay, firsts };
}

/** "{year} in the book" as copied, the same from All time and from the season picked, with its goal and its firsts. */
export function seasonCopy(book: Logbook, year: string, today: string): string {
  // The goal is the angler's own: the sample week's invented fish don't fill it, as Home and the goal box say.
  const goal = isSampleOnly(book) ? null : readYearGoal(year);
  return [yearSummary(book, year, today, goal), ...seasonFirsts(book, year, today).firsts].join("\n");
}

/** A picked season at a glance against the one before: fish, days out, kinds, and the kinds new to the book. */
/**
 * `fishLink` opens the season's fish and `outings` its outings, counted as what the link opens; `kindsId` is the heading
 * of the page's kinds, jumped to. Days out stay unlinked: two outings can share a day, and a day can be out without one.
 */
export function SeasonRecapBox({
  book,
  year,
  today,
  dayLink,
  fishLink,
  outings,
  kindsId,
  lureLink,
  waterLink,
}: {
  book: Logbook;
  year: string;
  today: string;
  dayLink?: (date: string) => string;
  fishLink?: string;
  outings?: { count: number; to: string };
  kindsId?: string;
  /** The season's fish on a lure, for its best lure line. */
  lureLink?: (lure: string) => string;
  /** The season's fish from a water, for its best water line. */
  waterLink?: (water: string) => string;
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
  const outingsLine = outings && outings.count > 0 ? t("Outings: {count}", { count: outings.count }) : null;
  // How the season fishes, not only how much: fish an outing, against the season before once both had a few.
  const rate = (fish: number, count: number) => (fish / count).toLocaleString(locale(), { maximumFractionDigits: 1 });
  const rateNow = recap.outings >= 2 ? rate(recap.outingFish, recap.outings) : null;
  const rateBefore = recap.outingsBefore >= 2 ? rate(recap.outingFishBefore, recap.outingsBefore) : null;
  const upFrom = recap.outingFish / Math.max(recap.outings, 1) > recap.outingFishBefore / Math.max(recap.outingsBefore, 1);
  const rateLine =
    rateNow === null
      ? null
      : rateBefore === null || rateBefore === rateNow
        ? t("Fish an outing: {rate}", { rate: rateNow })
        : upFrom
          ? t("Fish an outing: {rate}, up from {before} in {year}", { rate: rateNow, before: rateBefore, year: before })
          : t("Fish an outing: {rate}, down from {before} in {year}", { rate: rateNow, before: rateBefore, year: before });
  // The lure the season was won on, once one clearly led: the box is what gets shared.
  const [lure, nextLure] = pieceTally(book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${year}-`)), 2);
  const topLure = lure && lure.count >= 2 && lure.count > (nextLure?.count ?? 0) ? lure : null;
  const lureLine = topLure ? t("Best lure: {lure} ({count})", { lure: pieceName(topLure.lure), count: topLure.count }) : null;
  // And the water it was won on, once one clearly led: the "where" beside the "on what". Waters that read the same are
  // one, as the search its link opens takes them; the game's lake and the sample week are left out, as there.
  const byWater = new Map<string, { name: string; count: number }>();
  for (const entry of countedFish(book.catches)) {
    const spotName = book.spots.find((spot) => spot.id === entry.spotId)?.name;
    if (!spotName || !bookFishDay(book, entry).startsWith(`${year}-`)) continue;
    const name = plainName(spotName);
    const key = foldText(name).toLowerCase();
    byWater.set(key, { name: byWater.get(key)?.name ?? name, count: (byWater.get(key)?.count ?? 0) + 1 });
  }
  const [water, nextWater] = [...byWater.values()].sort((a, b) => b.count - a.count);
  const topWater = water && water.count >= 2 && water.count > (nextWater?.count ?? 0) ? water : null;
  const waterLine = topWater ? t("Best water: {water} ({count})", { water: topWater.name, count: topWater.count }) : null;
  const lines = [
    fishLine,
    daysLine,
    ...(outingsLine ? [outingsLine] : []),
    ...(rateLine ? [rateLine] : []),
    kindsLine,
    ...(lureLine ? [lureLine] : []),
    ...(waterLine ? [waterLine] : []),
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
            ) : topLure && lureLink && line === lureLine ? (
              <Link to={lureLink(topLure.lure)}>{line}</Link>
            ) : topWater && waterLink && line === waterLine ? (
              <Link to={waterLink(topWater.name)}>{line}</Link>
            ) : outings && line === outingsLine ? (
              <Link to={outings.to}>{line}</Link>
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
