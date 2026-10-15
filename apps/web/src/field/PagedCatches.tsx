import { Fragment, useState, type ReactNode } from "react";
import { t } from "../i18n";
import { monthName } from "./tripMonths";

/** Catch lists draw this many cards at a time; every landing in the game adds one, so a keen angler's lists run long. */
export const CATCH_PAGE = 50;

/** The items to draw and how many the next press of Show more adds. */
export function catchPage<T>(all: readonly T[], shown: number) {
  const visible = all.slice(0, shown);
  return { visible, more: Math.min(CATCH_PAGE, all.length - visible.length) };
}

/**
 * A stack of catch cards, a page at a time, with a Show more button under it while any are left.
 * Given monthOf ("2026-10"), a month heading goes above the first card of each month.
 */
export function PagedCatches<T>({
  items,
  children,
  monthOf,
}: {
  items: readonly T[];
  children: (item: T) => ReactNode;
  monthOf?: (item: T) => string;
}) {
  const [shown, setShown] = useState(CATCH_PAGE);
  const { visible, more } = catchPage(items, shown);
  return (
    <div className="stack">
      {monthOf
        ? visible.map((item, index) => {
            const month = monthOf(item);
            const head = index === 0 || monthOf(visible[index - 1] as T) !== month;
            return (
              <Fragment key={index}>
                {head ? <h3 className="month-head">{monthName(month)}</h3> : null}
                {children(item)}
              </Fragment>
            );
          })
        : visible.map(children)}
      {more > 0 && (
        <div className="show-more">
          <p role="status">{t("{shown} of {total} fish", { shown: visible.length, total: items.length })}</p>
          <button type="button" className="field-primary inline" onClick={() => setShown((count) => count + CATCH_PAGE)}>
            {t("Show {count} more", { count: more })}
          </button>
        </div>
      )}
    </div>
  );
}
