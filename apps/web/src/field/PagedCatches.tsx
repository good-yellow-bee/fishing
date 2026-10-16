import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { locale, t } from "../i18n";
import { fishCountLabel } from "./format";
import { monthName } from "./tripMonths";

/** Catch lists draw this many cards at a time; every landing in the game adds one, so a keen angler's lists run long. */
export const CATCH_PAGE = 50;

/** The items to draw and how many the next press of Show more adds. */
export function catchPage<T>(all: readonly T[], shown: number) {
  const visible = all.slice(0, shown);
  return { visible, more: Math.min(CATCH_PAGE, all.length - visible.length) };
}

/**
 * How many of a paged list to draw, and Show more. The press hands focus to the first link it brought in, since the
 * button itself goes once the last page is out; `box` wraps the list and its button.
 */
export function useShowMore() {
  const [shown, setShown] = useState(CATCH_PAGE);
  const box = useRef<HTMLDivElement>(null);
  const firstNew = useRef<number | null>(null);
  useEffect(() => {
    if (firstNew.current === null) return;
    box.current?.querySelectorAll<HTMLElement>("a[href]")[firstNew.current]?.focus();
    firstNew.current = null;
  }, [shown]);
  const showMore = () => {
    // The new cards come after every link already drawn, so the first of them is the next link along.
    firstNew.current = box.current?.querySelectorAll("a[href]").length ?? 0;
    setShown((count) => count + CATCH_PAGE);
  };
  /** Draws at least the first `count` items, a whole page further at a time. */
  const showUpTo = (count: number) => setShown((now) => (now >= count ? now : now + Math.ceil((count - now) / CATCH_PAGE) * CATCH_PAGE));
  return { shown, showMore, showUpTo, box };
}

/** A list over more months than this offers a jump row; a list over more than JUMP_YEARS_FROM months jumps by year. */
export const JUMP_FROM = 3;
export const JUMP_YEARS_FROM = 13;

/**
 * Where a long list can jump: each month ("2026-10") in list order, or the first month of each year once the months
 * run past a year's worth; nothing while the whole list fits one page or covers fewer than JUMP_FROM months.
 */
export function jumpMarks(months: readonly string[], total: number): { month: string; byYear: boolean }[] {
  const order = [...new Set(months)];
  if (total <= CATCH_PAGE || order.length < JUMP_FROM) return [];
  if (order.length < JUMP_YEARS_FROM) return order.map((month) => ({ month, byYear: false }));
  const years = new Map<string, string>();
  for (const month of order) if (!years.has(month.slice(0, 4))) years.set(month.slice(0, 4), month);
  return [...years.values()].map((month) => ({ month, byYear: true }));
}

function jumpLabel(month: string, byYear: boolean): string {
  if (byYear) return month.slice(0, 4);
  return new Intl.DateTimeFormat(locale(), { month: "short", year: "numeric" }).format(new Date(`${month}-15T12:00:00`));
}

/**
 * A stack of catch cards, a page at a time, with a Show more button under it while any are left.
 * Given monthOf ("2026-10"), a month heading goes above the first card of each month, at headLevel
 * (2 where nothing else heads the list, 3 under a section's h2), counting that month's fish in the whole list.
 */
export function PagedCatches<T>({
  items,
  children,
  monthOf,
  headLevel = 3,
}: {
  items: readonly T[];
  children: (item: T) => ReactNode;
  monthOf?: (item: T) => string;
  headLevel?: 2 | 3;
}) {
  const Head = headLevel === 2 ? "h2" : "h3";
  const { shown, showMore, showUpTo, box } = useShowMore();
  const { visible, more } = catchPage(items, shown);
  const monthCounts = new Map<string, number>();
  const firstOf = new Map<string, number>();
  if (monthOf)
    items.forEach((item, index) => {
      const month = monthOf(item);
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
      if (!firstOf.has(month)) firstOf.set(month, index);
    });
  const marks = jumpMarks([...firstOf.keys()], items.length);
  const idBase = useId();
  const headId = (month: string) => `${idBase}-${month}`;
  // A jump draws the pages down to the month, then hands it focus once its heading is out.
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  useEffect(() => {
    if (!jumpTo) return;
    const head = document.getElementById(headId(jumpTo));
    if (!head) return;
    head.focus();
    head.scrollIntoView({ block: "start" });
    setJumpTo(null);
  });
  return (
    <div className="stack" ref={box}>
      {marks.length > 0 ? (
        <nav className="form-note lure-tips month-jump" aria-label={marks[0]!.byYear ? t("Jump to a year") : t("Jump to a month")}>
          {marks[0]!.byYear ? t("Jump to a year:") : t("Jump to a month:")}{" "}
          {marks.map(({ month, byYear }) => (
            <button
              key={month}
              type="button"
              className="lure-tip"
              onClick={() => {
                showUpTo((firstOf.get(month) ?? 0) + 1);
                setJumpTo(month);
              }}
            >
              {jumpLabel(month, byYear)}
            </button>
          ))}
        </nav>
      ) : null}
      {monthOf
        ? visible.map((item, index) => {
            const month = monthOf(item);
            const head = index === 0 || monthOf(visible[index - 1] as T) !== month;
            return (
              <Fragment key={index}>
                {head ? (
                  <Head className="month-head" id={headId(month)} tabIndex={-1}>
                    {monthName(month)} · {fishCountLabel(monthCounts.get(month) ?? 0)}
                  </Head>
                ) : null}
                {children(item)}
              </Fragment>
            );
          })
        : visible.map(children)}
      {more > 0 && (
        <div className="show-more">
          <p role="status">{t("{shown} of {total} fish", { shown: visible.length, total: items.length })}</p>
          <button type="button" className="field-primary inline" onClick={showMore}>
            {t("Show {count} more", { count: more })}
          </button>
        </div>
      )}
    </div>
  );
}
