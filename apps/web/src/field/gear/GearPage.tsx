import { Fragment, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  WATER_LABELS,
  catchesForTrip,
  fishCountsByTrip,
  localDate,
  lureTally,
  measureOf,
  recentTrips,
  shiftDate,
  spotById,
  tripById,
  type Trip,
} from "@stillwater/shared";
import { fishCountLabel, formatCatchDay, formatDay, outingName, tripWhen } from "../format";
import { useLogbook } from "../LogbookState";
import { TackleList } from "./TackleList";
import { useTackle } from "./TackleState";
import { pieceRecords } from "./pieceRecord";
import { notYetThisYear } from "../bests/notYet";
import { exactTerm, findLink } from "../findLinks";
import { packingTips } from "../waterTips";
import { nearTwinLures } from "../suggestions";
import { renameInBook } from "../bookRename";
import { PagedTrips } from "../PagedTrips";
import { t, tn, useT } from "../../i18n";
import { measureText } from "../../i18n/content";
import { offPlayLake, upcomingOwnTrips, withoutPlayLake } from "../playLake";

function TripTackle({ trip, today, tomorrow }: { trip: Trip; today: string; tomorrow: string }) {
  const { book } = useLogbook();
  useT();
  const spot = spotById(book, trip.spotId);

  return (
    <section className="tackle-trip">
      <div className="section-head">
        <h2>
          <Link to={`/trips/${trip.id}`}>{outingName(trip, book.spots)}</Link>
        </h2>
        <span className="meta">
          {tripWhen(trip.date, today, tomorrow)}
          {spot ? ` · ${spot.name}` : ""}
        </span>
      </div>
      <TackleList
        tripId={trip.id}
        name={t("Tackle for {trip}", { trip: outingName(trip, book.spots) })}
        suggest={packingTips(book, trip, today)}
        trips={book.trips}
        spots={book.spots}
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
  const quiet = notYetThisYear(book.catches, new Date(), (entry) => entry.lure);
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
            {row.lure ? <Link to={findLink(withoutPlayLake(book, exactTerm("lure", t(row.lure)), book.catches))}>{t(row.label)}</Link> : <span>{t(row.label)}</span>}
            <span className="meta">
              {fishCountLabel(row.fish)} · {tn(row.outings, "{n} outing", "{n} outings")}
              {/* On a line of its own: beside the counts it broke mid-phrase on a phone. */}
              {row.lastAt ? (
                <>
                  <span className="lure-last">{t("last fish {day}", { day: formatCatchDay(row.lastAt) })}</span>
                  {/* Packed since without a fish: a lure that has gone quiet. */}
                  {row.since && row.since >= 2 ? <span className="lure-last">{tn(row.since, "none on {n} outing since", "none on {n} outings since")}</span> : null}
                  {/* Its biggest fish, opening that fish. */}
                  {row.largest ? (
                    <span className="lure-last">
                      <Link to={`/catches/${row.largest.entry.id}`}>
                        {t("Largest: {species}, {size}", { species: t(row.largest.entry.species), size: measureText(measureOf(row.largest.entry, row.largest.by)!) })}
                      </Link>
                    </span>
                  ) : null}
                </>
              ) : null}
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
      {/* Lures that took fish last year and none yet this year: worth a swim before the season ends. */}
      {quiet.length > 0 ? (
        <p className="meta not-yet">
          <span>
            {t("Not yet this year:")}{" "}
            {quiet.map((lure, index) => (
              <Fragment key={lure}>
                {index > 0 ? ", " : null}
                <Link to={findLink(withoutPlayLake(book, exactTerm("lure", t(lure)), book.catches))}>{t(lure)}</Link>
              </Fragment>
            ))}
          </span>
        </p>
      ) : null}
    </>
  );
}

/** Pairs the angler said are two lures, kept in this browser so the line doesn't come back. */
const KEPT_APART_KEY = "stillwater.field-log.lure-twins-kept.v1";

function readKeptApart(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEPT_APART_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

/** Lure names that look like one lure typed two ways, each with a button to fold one into the other or keep both. */
function LureTwins() {
  const { storedBook, changeBook } = useLogbook();
  const [kept, setKept] = useState(readKeptApart);
  // Either way round: the pair stays apart when the other spelling later takes more fish.
  const keyOf = (pair: { from: string; into: string }) => [pair.from.toLowerCase(), pair.into.toLowerCase()].sort().join("|");
  // Skipped inside the pairing, so a pair kept apart doesn't hide another real slip of either name.
  // The angler's own spellings: the game's lure names are its own and not slips to merge.
  const twins = nearTwinLures(lureTally({ ...storedBook, catches: storedBook.catches.filter(offPlayLake) }, Number.MAX_SAFE_INTEGER), (from, into) =>
    // The plain "from|into" key, either way round as the counts may have flipped, is how the first build kept a pair apart.
    [keyOf({ from, into }), `${from.toLowerCase()}|${into.toLowerCase()}`, `${into.toLowerCase()}|${from.toLowerCase()}`].some((key) => kept.includes(key)),
  ).filter(
    // Close as stored but not as shown (a sample lure in Polish) would read as two unrelated names.
    (pair) => (t(pair.from) === pair.from) === (t(pair.into) === pair.into),
  );
  if (twins.length === 0) return null;
  const keepApart = (pair: { from: string; into: string }) => {
    const next = [...kept, keyOf(pair)];
    setKept(next);
    try {
      localStorage.setItem(KEPT_APART_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked: hidden for this visit only.
    }
  };
  return (
    <ul className="lure-twins">
      {twins.map((pair) => (
        <li key={pair.from} className="meta">
          {t("“{from}” looks like “{into}”.", { from: t(pair.from), into: t(pair.into) })}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const result = renameInBook(storedBook, "lure", pair.from, pair.into);
              if (result.ok) changeBook("rename", result.book);
            }}
          >
            {t("Merge into {into}", { into: t(pair.into) })}
          </button>{" "}
          <button type="button" className="text-button" onClick={() => keepApart(pair)}>
            {t("They're different")}
          </button>
        </li>
      ))}
    </ul>
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
        <span className="tackle-past-title">{outingName(trip, book.spots)}</span>
        <span className="meta">
          {tripWhen(trip.date, today, tomorrow)}
          {spot ? ` · ${spot.name}` : ""}
          {` · ${fishCountLabel(catchesForTrip(book, trip.id).length)}`}
        </span>
      </summary>
      <p className="tackle-past-link">
        <Link to={`/trips/${trip.id}`}>{t("Open the outing")}</Link>
      </p>
      <TackleList tripId={trip.id} name={t("Tackle for {trip}", { trip: outingName(trip, book.spots) })} caught={catchesForTrip(book, trip.id)} trips={book.trips} spots={book.spots} />
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
            <h1>{outingName(trip, book.spots)}</h1>
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
          spots={book.spots}
          caught={trip.date <= today ? catchesForTrip(book, trip.id) : undefined}
        />
      </div>
    );
  }

  const upcoming = upcomingOwnTrips(book, today);
  // Real days out: a game day has nothing in the bag.
  const recent = recentTrips(book, today).filter(offPlayLake);
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
      <LureTwins />
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
