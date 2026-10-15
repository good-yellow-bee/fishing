import type { Trip } from "@stillwater/shared";
import { tn } from "../i18n";
import { fishCountLabel } from "./format";
import { monthName } from "./tripMonths";

/** A month's heading over its outings: the month, how many outings, and how many fish they brought. */
export function TripMonthHead({ month, trips, fishOn }: { month: string; trips: readonly Trip[]; fishOn: (tripId: string) => number }) {
  return (
    <h3 className="month-head">
      {monthName(month)}
      {" · "}
      {tn(trips.length, "{n} outing", "{n} outings")}
      {" · "}
      {fishCountLabel(trips.reduce((sum, trip) => sum + fishOn(trip.id), 0))}
    </h3>
  );
}
