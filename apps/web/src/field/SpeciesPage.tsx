import { Link, useParams } from "react-router-dom";
import { biteTimes, type CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { CatchCard } from "./cards";
import { FishSum } from "./FishSum";
import { fishCountLabel, formatCatchDay } from "./format";
import { useLogbook } from "./LogbookState";
import { PagedCatches } from "./PagedCatches";
import { catchesOfSpecies, speciesWaters } from "./speciesLink";
import { TallyBars } from "./TallyBars";
import { WaterTipsBox } from "./WaterTipsBox";

/** One kind of fish across the whole book: how many, how big, on what, and where. */
export function SpeciesPage() {
  const { book } = useLogbook();
  useT();
  const { species = "" } = useParams();
  const catches = catchesOfSpecies(book, species);
  const name = catches[0]?.species ?? species;
  const titleOf = (tripId: string | null) => (tripId ? (book.trips.find((trip) => trip.id === tripId)?.title ?? null) : null);

  if (catches.length === 0) {
    return (
      <div className="sheet">
        <h1>{t(name)}</h1>
        <p className="lede">{t("No fish of this kind in the book.")}</p>
        <Link to="/bests">{t("Back to bests")}</Link>
      </div>
    );
  }

  const waters = speciesWaters(book, catches);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">
            <Link to="/bests">{t("Bests")}</Link>
          </p>
          <h1>{t(name)}</h1>
        </div>
        <div className="sheet-actions">
          <Link to={`/catches/new?species=${encodeURIComponent(name)}`} className="field-primary inline">
            {t("Log another")}
          </Link>
        </div>
      </header>
      <FishSum catches={catches} oneKind />
      {catches.length > 1 ? <SpeciesSpan first={catches[catches.length - 1]!} last={catches[0]!} /> : null}
      <WaterTipsBox catches={catches} label={t("What it takes")} />
      <div className="section-head">
        <h2>{t("Where it comes from")}</h2>
      </div>
      <ul className="species-waters">
        {waters.map((water) => (
          <li key={water.spotId}>
            {water.name ? <Link to={`/spots/${water.spotId}`}>{water.name}</Link> : t("Unknown water")}
            <span className="meta">{fishCountLabel(water.count)}</span>
          </li>
        ))}
      </ul>
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("When it bites")}</h2>
          </div>
          <TallyBars rows={biteTimes({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count }))} />
        </>
      ) : null}
      <div className="section-head">
        <h2>{t("Every one in the book")}</h2>
      </div>
      <PagedCatches items={catches}>
        {(entry) => (
          <CatchCard
            key={entry.id}
            entry={entry}
            spotName={book.spots.find((spot) => spot.id === entry.spotId)?.name ?? t("Unknown water")}
            tripTitle={titleOf(entry.tripId)}
          />
        )}
      </PagedCatches>
    </div>
  );
}

/** The first and the newest fish of the kind, each a link to its catch. */
function SpeciesSpan({ first, last }: { first: CatchEntry; last: CatchEntry }) {
  const firstDay = <Link to={`/catches/${first.id}`}>{formatCatchDay(first.caughtAt)}</Link>;
  const lastDay = <Link to={`/catches/${last.id}`}>{formatCatchDay(last.caughtAt)}</Link>;
  return (
    <p className="meta species-span">
      {t("First in the book")} {firstDay} · {t("newest")} {lastDay}
    </p>
  );
}
