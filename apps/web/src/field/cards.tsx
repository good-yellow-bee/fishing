import { Link } from "react-router-dom";
import {
  WATER_LABELS,
  formatMeasure,
  type CatchEntry,
  type Spot,
  type Trip,
  type WaterType,
} from "@stillwater/shared";
import { fishCountLabel, formatClock, tripWhen } from "./format";

export function CatchCard({
  entry,
  spotName,
  tripTitle,
}: {
  entry: CatchEntry;
  spotName: string;
  tripTitle: string | null;
}) {
  return (
    <article className="catch-card">
      <p className={`measure measure-${entry.measure.kind}`}>{formatMeasure(entry.measure)}</p>
      <div>
        <h2>{entry.species}</h2>
        <p className="meta">
          <span>{entry.lure}</span>
          <span aria-hidden="true">·</span>
          <Link to={`/spots/${entry.spotId}`}>{spotName}</Link>
          <span aria-hidden="true">·</span>
          <time dateTime={entry.caughtAt}>{formatClock(entry.caughtAt)}</time>
        </p>
        {entry.note ? <p className="note">{entry.note}</p> : null}
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
  spotName: string;
  waterType: WaterType | null;
  fishCount: number;
  today: string;
  tomorrow: string;
}) {
  return (
    <Link to={`/trips/${trip.id}`} className="trip-card">
      <p className="when">{tripWhen(trip.date, today, tomorrow)}</p>
      <div>
        <h2>{trip.title}</h2>
        <p className="meta">
          {spotName}
          {waterType ? ` · ${WATER_LABELS[waterType]}` : ""}
          {" · "}
          {fishCountLabel(fishCount)}
        </p>
      </div>
    </Link>
  );
}

export function SpotCard({ spot, fishCount, tripCount }: { spot: Spot; fishCount: number; tripCount: number }) {
  return (
    <Link to={`/spots/${spot.id}`} className="spot-card">
      <div className="spot-card-top">
        <h2>{spot.name}</h2>
        <span className={`stamp stamp-${spot.waterType}`}>{WATER_LABELS[spot.waterType]}</span>
      </div>
      <p className="conditions-line">{spot.bestConditions || "Conditions not noted"}</p>
      <p className="meta">
        {fishCountLabel(fishCount)}
        {" · "}
        {tripCount === 1 ? "1 outing" : `${tripCount} outings`}
      </p>
    </Link>
  );
}
