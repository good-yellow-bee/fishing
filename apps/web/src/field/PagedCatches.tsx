import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../i18n";
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
  return { shown, showMore, box };
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
  const { shown, showMore, box } = useShowMore();
  const { visible, more } = catchPage(items, shown);
  const monthCounts = new Map<string, number>();
  if (monthOf) for (const item of items) monthCounts.set(monthOf(item), (monthCounts.get(monthOf(item)) ?? 0) + 1);
  return (
    <div className="stack" ref={box}>
      {monthOf
        ? visible.map((item, index) => {
            const month = monthOf(item);
            const head = index === 0 || monthOf(visible[index - 1] as T) !== month;
            return (
              <Fragment key={index}>
                {head ? (
                  <Head className="month-head">
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
