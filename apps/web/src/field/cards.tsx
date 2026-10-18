import { memo } from "react";
import { Link } from "react-router-dom";
import {
  WATER_LABELS,
  itemsForTrip,
  packedCount,
  type CatchEntry,
  type Spot,
  type Trip,
  type WaterType,
} from "@stillwater/shared";
import { tn, useT } from "../i18n";
import { measuresText } from "../i18n/content";
import { fishCountLabel, formatClock, formatDay, noteText, outingName, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { catchBadge } from "./catchBadge";
import { WeatherLine } from "./Weather";
import { exactTerm, findLink } from "./findLinks";
import { useTackleItems } from "./gear/TackleState";
import { catchLink, type ListKey } from "./catchList";
import { FROM_LIST } from "./leaveDeleted";
import { isPlanned } from "./TripMonthHead";

/** A card's heading sits one below the section it is listed under. */
type CardLevel = 2 | 3 | 4;

/** Memoized: a long list that grows by a page redraws only the new cards (its props are ids, names and book entries). */
export const CatchCard = memo(function CatchCard({
  entry,
  spotName,
  tripTitle,
  level = 3,
  list,
}: {
  entry: CatchEntry;
  /** Null on the water's own page, where naming the water again says nothing. */
  spotName: string | null;
  tripTitle: string | null;
  level?: CardLevel;
  /** The list this card sits in, so the catch page steps through it rather than the whole book. */
  list?: ListKey;
}) {
  const Head = `h${level}` as const;
  const t = useT();
  const { book, photoFor } = useLogbook();
  const photo = photoFor(entry.id);
  const badge = catchBadge(book, entry);
  return (
    <article className={photo ? "catch-card has-photo" : "catch-card"}>
      {photo ? <img className="catch-thumb" src={photo} alt="" /> : null}
      <p className={`measure measure-${entry.measure.kind}`}>{measuresText(entry)}</p>
      <div>
        <Head>
          <Link to={catchLink(entry.id, list)} state={FROM_LIST}>{t(entry.species)}</Link>
          {badge ? <span className="card-badge">{badge === "book" ? t("Book record") : t("Best of its kind")}</span> : null}
        </Head>
        <p className="meta">
          {/* Every fish taken on this lure, as on the catch page. */}
          <Link to={findLink(exactTerm("lure", t(entry.lure)))}>{t(entry.lure)}</Link>
          <span aria-hidden="true">·</span>
          {spotName !== null ? (
            <>
              <Link to={`/spots/${entry.spotId}`}>{spotName}</Link>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <time dateTime={entry.caughtAt}>{formatClock(entry.caughtAt)}</time>
          {entry.released ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{t("Released")}</span>
            </>
          ) : null}
        </p>
        <WeatherLine weather={entry.weather} />
        {entry.note ? <p className="note">{noteText(entry.note)}</p> : null}
        {entry.tripId && tripTitle ? (
          <p className="trip-link">
            {/* An untitled outing goes by its water's name, already on the line above: said once. */}
            <Link to={`/trips/${entry.tripId}`}>{tripTitle === spotName ? t("That day's outing") : tripTitle}</Link>
          </p>
        ) : null}
      </div>
    </article>
  );
});

export function TripCard({
  trip,
  spotName,
  waterType,
  fishCount,
  today,
  tomorrow,
  level = 3,
}: {
  trip: Trip;
  /** Null on the water's own page, where the water and its type go without saying. */
  spotName: string | null;
  waterType: WaterType | null;
  fishCount: number;
  today: string;
  tomorrow: string;
  level?: CardLevel;
}) {
  const Head = `h${level}` as const;
  const t = useT();
  const tackle = useTackleItems();
  const { book } = useLogbook();
  // An outing still ahead with nothing logged: how the bag is coming along says more than "Nothing logged".
  const bag = tackle && fishCount === 0 && trip.date >= today ? itemsForTrip(tackle, trip.id) : [];
  const packed = packedCount(bag);
  const tally =
    bag.length === 0
      ? // Still ahead, or today's before its first fish, with nothing packed: planned, not a blank day.
        isPlanned(trip, today, fishCount)
        ? t("Planned")
        : fishCountLabel(fishCount)
      : packed === bag.length
        ? t("All packed")
        : t("{packed} of {total} packed", { packed, total: bag.length });
  return (
    <Link to={`/trips/${trip.id}`} className="trip-card" state={FROM_LIST}>
      <p className="when">{tripWhen(trip.date, today, tomorrow)}</p>
      <div>
        <Head>{outingName(trip, book.spots)}</Head>
        <p className="meta">
          {/* The fish that got away too, so a hard day stands out in the list. */}
          {/* An untitled outing is already named after its water. */}
          {[spotName === outingName(trip, book.spots) ? null : spotName, waterType ? t(WATER_LABELS[waterType]) : null, tally, trip.lost ? tn(trip.lost, "{n} lost", "{n} lost") : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

export function SpotCard({
  spot,
  fishCount,
  tripCount,
  lastFishDay = null,
  restDays = null,
  nextOuting = null,
}: {
  spot: Spot;
  fishCount: number;
  tripCount: number;
  lastFishDay?: string | null;
  /** Days since the water was last fished, when the list is ordered by that. */
  restDays?: number | null;
  /** The soonest planned outing here, already in words. */
  nextOuting?: string | null;
}) {
  const t = useT();
  return (
    <Link to={`/spots/${spot.id}`} className="spot-card" state={FROM_LIST}>
      <div className="spot-card-top">
        <h2>{spot.name}</h2>
        <span className={`stamp stamp-${spot.waterType}`}>{t(WATER_LABELS[spot.waterType])}</span>
      </div>
      <p className="conditions-line">{spot.bestConditions || t("Conditions not noted")}</p>
      <p className="meta">
        {fishCountLabel(fishCount)}
        {" · "}
        {tn(tripCount, "{n} outing", "{n} outings")}
        {lastFishDay ? ` · ${t("Last fish: {day}", { day: formatDay(lastFishDay) })}` : ""}
      </p>
      {restDays !== null ? <p className="meta">{restDays === 0 ? t("Fished here today") : restDays === 1 ? t("Last fished here yesterday") : tn(restDays, "Last fished here {n} day ago", "Last fished here {n} days ago")}</p> : null}
      {nextOuting ? <p className="meta next-outing">{nextOuting}</p> : null}
    </Link>
  );
}
