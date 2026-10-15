import { Link, useParams } from "react-router-dom";
import { t, useT } from "../i18n";
import { CatchCard } from "./cards";
import { FishSum } from "./FishSum";
import { fishCountLabel } from "./format";
import { useLogbook } from "./LogbookState";
import { PagedCatches } from "./PagedCatches";
import { catchesOfSpecies, speciesWaters } from "./speciesLink";
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
      </header>
      <FishSum catches={catches} oneKind />
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
