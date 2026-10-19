import { localDate, type Trip } from "@stillwater/shared";
import { tn } from "../i18n";
import { fishCountLabel } from "./format";
import { monthName } from "./tripMonths";
import { PLAY_LAKE_ID } from "./playLake";

/** A month's heading over its outings: the month, how many outings, and how many fish they brought. */
/** An outing still to come, or today's before its first fish, is counted apart as planned, as a water's season line and the cards say it. */
/** `counted` says which outings are the angler's own, as Home and Bests count them; the sample week's and the game's are said apart. */
export function TripMonthHead({ month, trips: all, fishOn, counted }: { month: string; trips: readonly Trip[]; fishOn: (tripId: string) => number; counted?: (trip: Trip) => boolean }) {
  const today = localDate(new Date());
  const own = counted ? all.filter(counted) : all;
  const others = all.length - own.length;
  // A month of only the sample week's or the game's outings says so, rather than counting them as the angler's.
  if (own.length === 0 && others > 0) return <h3 className="month-head">{`${monthName(month)} · ${tn(others, "{n} from the sample week or the game", "{n} from the sample week or the game")}`}</h3>;
  const trips = own;
  const planned = trips.filter((trip) => isPlanned(trip, today, fishOn(trip.id))).length;
  const fished = trips.length - planned;
  return (
    <h3 className="month-head">
      {monthName(month)}
      {fished > 0 || planned === 0 ? ` · ${tn(fished, "{n} outing", "{n} outings")}` : ""}
      {planned > 0 ? ` · ${tn(planned, "{n} planned", "{n} planned")}` : ""}
      {fished > 0 ? ` · ${fishCountLabel(trips.reduce((sum, trip) => sum + fishOn(trip.id), 0))}` : ""}
      {others > 0 ? ` · ${tn(others, "+{n} from the sample week or the game", "+{n} from the sample week or the game")}` : ""}
    </h3>
  );
}

/** An outing still to come, or today's before its first fish; never a round of the game, which is made by playing. */
export function isPlanned(trip: Trip, today: string, fish: number): boolean {
  return trip.spotId !== PLAY_LAKE_ID && trip.date >= today && fish === 0;
}
