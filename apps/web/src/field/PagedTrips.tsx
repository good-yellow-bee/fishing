import type { ReactNode } from "react";
import type { Trip } from "@stillwater/shared";
import { t } from "../i18n";
import { catchPage, useShowMore } from "./PagedCatches";
import { monthName, tripsByMonth } from "./tripMonths";
import { TripMonthHead } from "./TripMonthHead";

/**
 * Past outings, newest first, a page at a time under month headings, with Show more while any are left.
 * A month cut by the page still counts all of its outings and fish in its heading.
 * `stack` wraps each month's cards in the card stack (the Trips page); the Tackle page lays them out itself.
 */
export function PagedTrips({
  trips,
  fishOn,
  children,
  stack = false,
}: {
  trips: readonly Trip[];
  fishOn: (tripId: string) => number;
  children: (trip: Trip) => ReactNode;
  stack?: boolean;
}) {
  const { shown, showMore, box } = useShowMore();
  const { visible, more } = catchPage(trips, shown);
  const wholeMonths = new Map(tripsByMonth(trips).map((group) => [group.month, group.trips]));
  return (
    // Only there to hold the list for Show more's focus: it lays nothing out.
    <div ref={box} className="paged-list">
      {tripsByMonth(visible).map((group) => (
        <section key={group.month} aria-label={monthName(group.month)}>
          <TripMonthHead month={group.month} trips={wholeMonths.get(group.month) ?? group.trips} fishOn={fishOn} />
          {stack ? <div className="stack">{group.trips.map(children)}</div> : group.trips.map(children)}
        </section>
      ))}
      {more > 0 && (
        <div className="show-more">
          <p role="status">{t("{shown} of {total} outings", { shown: visible.length, total: trips.length })}</p>
          <button type="button" className="field-primary inline" onClick={showMore}>
            {t("Show {count} more", { count: more })}
          </button>
        </div>
      )}
    </div>
  );
}
