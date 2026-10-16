import { Link, useParams } from "react-router-dom";
import { FISH, biteTimes, moonTally, seasonTally, skyTally, type CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { CatchCard } from "./cards";
import { FishSum } from "./FishSum";
import { fishCountLabel, formatCatchDay } from "./format";
import { useLogbook } from "./LogbookState";
import { PagedCatches } from "./PagedCatches";
import { catchMonth } from "./tripMonths";
import { catchesOfSpecies, speciesWaters } from "./speciesLink";
import { TallyBars } from "./TallyBars";
import { findWithLink } from "./CatchSearch";
import { WaterTipsBox } from "./WaterTipsBox";
import { bestSteps, type BestStep } from "./bestSteps";
import { measureText } from "../i18n/content";

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
  /** Only worth a chart once the kind has come in more than one season. */
  const seasons = seasonTally({ ...book, catches });

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
          {/* Lake fish also have a card in the game's field guide, on its Log page. */}
          {FISH.some((fish) => fish.name.toLowerCase() === name.trim().toLowerCase()) ? <Link to="/log">{t("Field guide")}</Link> : null}
          <Link to={`/catches/new?species=${encodeURIComponent(name)}`} className="field-primary inline">
            {t("Log another")}
          </Link>
        </div>
      </header>
      <FishSum catches={catches} oneKind />
      {catches.length > 1 ? <SpeciesSpan first={catches[catches.length - 1]!} last={catches[0]!} /> : null}
      <WaterTipsBox catches={catches} label={t("What it takes")} within={t(name)} />
      <BestGrowth catches={catches} />
      <div className="section-head">
        <h2>{t("Where it comes from")}</h2>
      </div>
      <ul className="species-waters">
        {waters.map((water) => (
          <li key={water.spotId}>
            {water.name ? <Link to={`/spots/${water.spotId}`}>{water.name}</Link> : t("Unknown water")}
            <span className="meta">
              {/* The count opens just those fish, through the catch search. */}
              {water.name ? <Link to={findWithLink(t(name), water.name)}>{fishCountLabel(water.count)}</Link> : fishCountLabel(water.count)}
            </span>
          </li>
        ))}
      </ul>
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("When it bites")}</h2>
          </div>
          <TallyBars rows={biteTimes({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(t(name), t(row.label)) : undefined }))} />
        </>
      ) : null}
      {seasons.filter((row) => row.count > 0).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By season")}</h2>
          </div>
          <TallyBars rows={seasons.map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(t(name), t(row.label)) : undefined }))} />
        </>
      ) : null}
      {catches.filter((entry) => entry.weather).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By the weather")}</h2>
          </div>
          <TallyBars rows={skyTally({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(t(name), t(row.label)) : undefined }))} />
        </>
      ) : null}
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By the moon")}</h2>
          </div>
          <TallyBars rows={moonTally({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(t(name), t(row.label)) : undefined }))} />
        </>
      ) : null}
      <div className="section-head">
        <h2>{t("Every one in the book")}</h2>
      </div>
      <PagedCatches items={catches} monthOf={catchMonth}>
        {(entry) => (
          <CatchCard
            level={4}
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

/** Each fish that beat the best of the kind before it, oldest first, with what it added; shown once the first was ever beaten. */
function BestGrowth({ catches }: { catches: readonly CatchEntry[] }) {
  const lists = [bestSteps(catches, "length"), bestSteps(catches, "weight")].filter((steps): steps is BestStep[] => steps !== null);
  if (lists.length === 0) return null;
  return (
    <>
      <div className="section-head">
        <h2>{t("How the best grew")}</h2>
      </div>
      {lists.map((steps) => (
        <ol key={steps[0]!.entry.measure.kind} className="species-waters best-steps">
          {steps.map(({ entry, gain }) => (
            <li key={entry.id}>
              <Link to={`/catches/${entry.id}`}>{measureText(entry.measure)}</Link>
              <span className="meta">
                {formatCatchDay(entry.caughtAt)}
                {gain ? ` · +${measureText(gain)}` : ` · ${t("the first")}`}
              </span>
            </li>
          ))}
        </ol>
      ))}
    </>
  );
}
