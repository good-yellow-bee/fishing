import { localDate, type Trip } from "@stillwater/shared";
import { tn } from "../i18n";
import { fishCountLabel } from "./format";
import { monthName } from "./tripMonths";

/** A month's heading over its outings: the month, how many outings, and how many fish they brought. */
/** An outing still to come, or today's before its first fish, is counted apart as planned, as a water's season line and the cards say it. */
export function TripMonthHead({ month, trips, fishOn }: { month: string; trips: readonly Trip[]; fishOn: (tripId: string) => number }) {
  const today = localDate(new Date());
  const planned = trips.filter((trip) => trip.date >= today && fishOn(trip.id) === 0).length;
  const fished = trips.length - planned;
  return (
    <h3 className="month-head">
      {monthName(month)}
      {fished > 0 || planned === 0 ? ` · ${tn(fished, "{n} outing", "{n} outings")}` : ""}
      {planned > 0 ? ` · ${tn(planned, "{n} planned", "{n} planned")}` : ""}
      {fished > 0 ? ` · ${fishCountLabel(trips.reduce((sum, trip) => sum + fishOn(trip.id), 0))}` : ""}
    </h3>
  );
}
