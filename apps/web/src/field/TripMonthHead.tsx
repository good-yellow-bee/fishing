import { localDate, type Trip } from "@stillwater/shared";
import { tn } from "../i18n";
import { fishSum } from "./format";
import { monthName } from "./tripMonths";
import { PLAY_LAKE_ID } from "./playLake";
import { outingDay } from "./tripDates";

/** A month's heading over its outings: the month, how many outings, and how many fish they brought. */
/** An outing still to come, or today's before its first fish, is counted apart as planned, as a water's season line and the cards say it. */
/** `counted` says which outings are the angler's own, as Home and Bests count them; the sample week's and the game's are said apart. */
export function TripMonthHead({ month, trips: all, fishOn, counted }: { month: string; trips: readonly Trip[]; fishOn: (tripId: string) => number; counted?: (trip: Trip) => boolean }) {
  const today = localDate(new Date());
  const own = counted ? all.filter(counted) : all;
  const rest = counted ? all.filter((trip) => !counted(trip)) : [];
  const others = rest.length;
  // Said as what they are: only the game's rounds, only the sample week, or some of each.
  const game = rest.every((trip) => trip.spotId === PLAY_LAKE_ID);
  const sample = rest.every((trip) => trip.spotId !== PLAY_LAKE_ID);
  // A month of only the sample week's or the game's outings says so, rather than counting them as the angler's.
  if (own.length === 0 && others > 0) {
    const label = game ? tn(others, "{n} from the game", "{n} from the game") : sample ? tn(others, "{n} from the sample week", "{n} from the sample week") : tn(others, "{n} from the sample week or the game", "{n} from the sample week or the game");
    return <h3 className="month-head">{`${monthName(month)} · ${label}`}</h3>;
  }
  const trips = own;
  const planned = trips.filter((trip) => isPlanned(trip, today, fishOn(trip.id))).length;
  const fished = trips.length - planned;
  return (
    <h3 className="month-head">
      {monthName(month)}
      {fished > 0 || planned === 0 ? ` · ${tn(fished, "{n} outing", "{n} outings")}` : ""}
      {planned > 0 ? ` · ${tn(planned, "{n} planned", "{n} planned")}` : ""}
      {fished > 0 ? ` · ${fishSum(trips.reduce((sum, trip) => sum + fishOn(trip.id), 0))}` : ""}
      {others > 0
        ? ` · ${game ? tn(others, "+{n} from the game", "+{n} from the game") : sample ? tn(others, "+{n} from the sample week", "+{n} from the sample week") : tn(others, "+{n} from the sample week or the game", "+{n} from the sample week or the game")}`
        : ""}
    </h3>
  );
}

/**
 * An outing still to come, or today's before its first fish; never a round of the game, which is made by playing. In
 * the small hours last evening's is still today's: an outing going on past midnight isn't a blank day yet.
 */
export function isPlanned(trip: Trip, today: string, fish: number): boolean {
  return trip.spotId !== PLAY_LAKE_ID && trip.date >= outingDay(today) && fish === 0;
}
