import type { Trip, TripCount } from "@stillwater/shared";
import { useLogbook } from "./LogbookState";
import { t, useT } from "../i18n";

const TRIP_COUNTS: { count: TripCount; label: string; more: string; fewer: string }[] = [
  { count: "lost", label: "Lost fish", more: "One more lost fish", fewer: "One fewer lost fish" },
  { count: "missed", label: "Missed strikes", more: "One more missed strike", fewer: "One fewer missed strike" },
];

/** Tap-to-count tallies of fish lost and strikes missed on an outing, and how many of the hooked fish were landed. */
export function TripCounts({ trip, landed }: { trip: Trip; landed: number }) {
  const { countOnTrip } = useLogbook();
  useT();
  const lost = trip.lost ?? 0;
  return (
    <div className="trip-counts">
      {TRIP_COUNTS.map(({ count, label, more, fewer }) => (
        <p key={count} className="trip-count">
          {/* Read out as it changes, since the buttons are named for what they do. */}
          <span role="status">
            {t(label)}: <strong>{trip[count] ?? 0}</strong>
          </span>
          {/* Not disabled outright: focus stays on the button when the count reaches none. */}
          <button
            type="button"
            className="count-button"
            aria-label={t(fewer)}
            aria-disabled={trip[count] ? undefined : true}
            onClick={() => {
              if (trip[count]) countOnTrip(trip.id, count, -1);
            }}
          >
            −
          </button>
          <button type="button" className="count-button" aria-label={t(more)} onClick={() => countOnTrip(trip.id, count, 1)}>
            +
          </button>
        </p>
      ))}
      {lost > 0 && landed > 0 ? <p className="meta">{t("Landed {landed} of {hooked} hooked.", { landed, hooked: landed + lost })}</p> : null}
    </div>
  );
}
