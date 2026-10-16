import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  WATER_LABELS,
  catchesForTrip,
  fishCountsByTrip,
  localDate,
  recentTrips,
  shiftDate,
  spotById,
  tripById,
  upcomingTrips,
  type Trip,
} from "@stillwater/shared";
import { fishCountLabel, formatDay, tripWhen } from "../format";
import { useLogbook } from "../LogbookState";
import { TackleList } from "./TackleList";
import { useTackle } from "./TackleState";
import { pieceRecords } from "./pieceRecord";
import { exactTerm, findLink } from "../findLinks";
import { packingTips } from "../waterTips";
import { PagedTrips } from "../PagedTrips";
import { t, tn, useT } from "../../i18n";

function TripTackle({ trip, today, tomorrow }: { trip: Trip; today: string; tomorrow: string }) {
  const { book } = useLogbook();
  useT();
  const spot = spotById(book, trip.spotId);

  return (
    <section className="tackle-trip">
      <div className="section-head">
        <h2>
          <Link to={`/trips/${trip.id}`}>{trip.title}</Link>
        </h2>
        <span className="meta">
          {tripWhen(trip.date, today, tomorrow)}
          {spot ? ` · ${spot.name}` : ""}
        </span>
      </div>
      <TackleList
        tripId={trip.id}
        name={t("Tackle for {trip}", { trip: trip.title })}
        suggest={packingTips(book, trip, today)}
        trips={book.trips}
        // Today's outing may already have fish, counted against the pieces as on the outing's page.
        caught={trip.date <= today ? catchesForTrip(book, trip.id) : undefined}
      />
    </section>
  );
}

/** How many lures the record lists before the rest. */
const RECORD_ROWS = 8;

/** Each lure taken on past outings: the outings it went on and the fish it took there, most fish first. */
function LureRecord({ today }: { today: string }) {
  const { book } = useLogbook();
  const { items } = useTackle();
  const records = pieceRecords(book, items, today);
  const [all, setAll] = useState(false);
  if (records.length === 0) return null;
  const fold = records.length > RECORD_ROWS;
  return (
    <>
      <h2 className="subhead">{t("Lure record")}</h2>
      <ul className="species-waters lure-record">
        {(all ? records : records.slice(0, RECORD_ROWS)).map((row) => (
          <li key={row.label}>
            {/* A lure that took fish opens them in the catch search. */}
            {row.lure ? <Link to={findLink(exactTerm("lure", t(row.lure)))}>{t(row.label)}</Link> : <span>{t(row.label)}</span>}
            <span className="meta">
              {fishCountLabel(row.fish)} · {tn(row.outings, "{n} outing", "{n} outings")}
            </span>
          </li>
        ))}
      </ul>
      {fold ? (
        <p className="tally-more">
          <button type="button" className="text-button" aria-expanded={all} onClick={() => setAll((open) => !open)}>
            {all ? t("Show fewer") : t("Show all {count}", { count: records.length })}
          </button>
        </p>
      ) : null}
    </>
  );
}

/** A past outing's list, folded away: it matters again only when the same bag goes out. */
function PastTripTackle({ trip, today, tomorrow }: { trip: Trip; today: string; tomorrow: string }) {
  const { book } = useLogbook();
  useT();
  const spot = spotById(book, trip.spotId);

  return (
    <details className="tackle-trip tackle-past">
      <summary>
        <span className="tackle-past-title">{trip.title}</span>
        <span className="meta">
          {tripWhen(trip.date, today, tomorrow)}
          {spot ? ` · ${spot.name}` : ""}
          {` · ${fishCountLabel(catchesForTrip(book, trip.id).length)}`}
        </span>
      </summary>
      <p className="tackle-past-link">
        <Link to={`/trips/${trip.id}`}>{t("Open the outing")}</Link>
      </p>
      <TackleList tripId={trip.id} name={t("Tackle for {trip}", { trip: trip.title })} caught={catchesForTrip(book, trip.id)} trips={book.trips} />
    </details>
  );
}

export function GearPage() {
  const { book } = useLogbook();
  useT();
  const { tripId } = useParams();
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);

  if (tripId) {
    const trip = tripById(book, tripId);
    if (!trip) {
      return (
        <div className="sheet">
          <h1>{t("Missing outing")}</h1>
          <p className="lede">{t("That trip is not in this book.")}</p>
          <Link to="/gear">{t("Back to tackle")}</Link>
        </div>
      );
    }
    const spot = spotById(book, trip.spotId);
    return (
      <div className="sheet">
        <header className="sheet-head">
          <div>
            <p className="eyebrow">
              <Link to="/gear">{t("Tackle")}</Link>
              {" · "}
              {tripWhen(trip.date, today, tomorrow)}
            </p>
            <h1>{trip.title}</h1>
            <p className="meta stand">
              <time dateTime={trip.date}>{formatDay(trip.date)}</time>
              {spot ? (
                <>
                  {" · "}
                  <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
                  {" · "}
                  {t(WATER_LABELS[spot.waterType])}
                </>
              ) : null}
            </p>
          </div>
          <Link to={`/trips/${trip.id}`}>{t("Outing")}</Link>
        </header>
        <TackleList
          tripId={trip.id}
          heading={t("In the bag")}
          suggest={packingTips(book, trip, today)}
          trips={book.trips}
          caught={trip.date <= today ? catchesForTrip(book, trip.id) : undefined}
        />
      </div>
    );
  }

  const upcoming = upcomingTrips(book, today);
  const recent = recentTrips(book, today);
  const fishByTrip = fishCountsByTrip(book);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Before you leave")}</p>
          <h1>{t("Tackle")}</h1>
          <p className="lede">{t("What goes in the bag for each outing. A check stays in this browser.")}</p>
        </div>
      </header>
      <h2 className="subhead">{t("Coming up")}</h2>
      {upcoming.length === 0 ? (
        <p className="empty">
          {t("No upcoming outings.")} <Link to="/trips/new">{t("Plan one")}</Link>
        </p>
      ) : (
        upcoming.map((trip) => <TripTackle key={trip.id} trip={trip} today={today} tomorrow={tomorrow} />)
      )}
      <LureRecord today={today} />
      <h2 className="subhead">{t("Recent")}</h2>
      {recent.length === 0 ? (
        <p className="empty">{t("No past outings.")}</p>
      ) : (
        <PagedTrips trips={recent} fishOn={(id) => fishByTrip.get(id) ?? 0}>
          {(trip) => <PastTripTackle key={trip.id} trip={trip} today={today} tomorrow={tomorrow} />}
        </PagedTrips>
      )}
    </div>
  );
}
