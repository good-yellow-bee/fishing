import { Link } from "react-router-dom";
import {
  WATER_LABELS,
  itemsForTrip,
  localDate,
  packedCount,
  type CatchEntry,
  type Spot,
  type Trip,
  type WaterType,
} from "@stillwater/shared";
import { tn, useT } from "../i18n";
import { measureText } from "../i18n/content";
import { fishCountLabel, formatClock, formatDay, noteText, tripWhen } from "./format";
import { useLogbook } from "./LogbookState";
import { catchBadge } from "./catchBadge";
import { WeatherLine } from "./Weather";
import { useTackleItems } from "./gear/TackleState";

export function CatchCard({
  entry,
  spotName,
  tripTitle,
}: {
  entry: CatchEntry;
  /** Null on the water's own page, where naming the water again says nothing. */
  spotName: string | null;
  tripTitle: string | null;
}) {
  const t = useT();
  const { book, photoFor } = useLogbook();
  const photo = photoFor(entry.id);
  const badge = catchBadge(book, entry);
  return (
    <article className={photo ? "catch-card has-photo" : "catch-card"}>
      {photo ? <img className="catch-thumb" src={photo} alt="" /> : null}
      <p className={`measure measure-${entry.measure.kind}`}>{measureText(entry.measure)}</p>
      <div>
        <h2>
          <Link to={`/catches/${entry.id}`}>{t(entry.species)}</Link>
          {badge ? <span className="card-badge">{badge === "book" ? t("Book record") : t("Best of its kind")}</span> : null}
        </h2>
        <p className="meta">
          <span>{t(entry.lure)}</span>
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
            <Link to={`/trips/${entry.tripId}`}>{tripTitle}</Link>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function TripCard({
  trip,
  spotName,
  waterType,
  fishCount,
  today,
  tomorrow,
}: {
  trip: Trip;
  /** Null on the water's own page, where the water and its type go without saying. */
  spotName: string | null;
  waterType: WaterType | null;
  fishCount: number;
  today: string;
  tomorrow: string;
}) {
  const t = useT();
  const tackle = useTackleItems();
  // An outing still ahead with nothing logged: how the bag is coming along says more than "Nothing logged".
  const bag = tackle && fishCount === 0 && trip.date >= today ? itemsForTrip(tackle, trip.id) : [];
  const packed = packedCount(bag);
  const tally =
    bag.length === 0
      ? fishCountLabel(fishCount)
      : packed === bag.length
        ? t("All packed")
        : t("{packed} of {total} packed", { packed, total: bag.length });
  return (
    <Link to={`/trips/${trip.id}`} className="trip-card">
      <p className="when">{tripWhen(trip.date, today, tomorrow)}</p>
      <div>
        <h2>{trip.title}</h2>
        <p className="meta">
          {[spotName, waterType ? t(WATER_LABELS[waterType]) : null, tally].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

export function SpotCard({
  spot,
  fishCount,
  tripCount,
  lastFishAt = null,
}: {
  spot: Spot;
  fishCount: number;
  tripCount: number;
  lastFishAt?: string | null;
}) {
  const t = useT();
  return (
    <Link to={`/spots/${spot.id}`} className="spot-card">
      <div className="spot-card-top">
        <h2>{spot.name}</h2>
        <span className={`stamp stamp-${spot.waterType}`}>{t(WATER_LABELS[spot.waterType])}</span>
      </div>
      <p className="conditions-line">{spot.bestConditions || t("Conditions not noted")}</p>
      <p className="meta">
        {fishCountLabel(fishCount)}
        {" · "}
        {tn(tripCount, "{n} outing", "{n} outings")}
        {lastFishAt ? ` · ${t("Last fish: {day}", { day: formatDay(localDate(new Date(lastFishAt))) })}` : ""}
      </p>
    </Link>
  );
}
