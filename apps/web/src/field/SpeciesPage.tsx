import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { FISH, biteTimes, lureTally, moonTally, seasonTally, sizePairs, skyTally, type CatchEntry, type Measure } from "@stillwater/shared";
import { getUnits, num, t, useT } from "../i18n";
import { CatchCard } from "./cards";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { fishCountLabel, formatCatchDay } from "./format";
import { useLogbook } from "./LogbookState";
import { PagedCatches } from "./PagedCatches";
import { catchMonth } from "./tripMonths";
import { catchesOfSpecies, speciesWaters } from "./speciesLink";
import { TallyBars } from "./TallyBars";
import { exactTerm, findWithLink } from "./findLinks";
import { WaterTipsBox } from "./WaterTipsBox";
import { bestSteps, type BestStep } from "./bestSteps";
import { CM_PER_IN, KG_PER_LB, lengthText, measureText, weightText } from "../i18n/content";
import { WeatherBars } from "./WeatherBars";
import { CopySummary } from "./CopySummary";
import { speciesSummary } from "./summaries";
import { RenameKind } from "./RenameKind";

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
      <FishCsv catches={catches} name={t(name)} />
      {catches.length > 1 ? <SpeciesSpan first={catches[catches.length - 1]!} last={catches[0]!} /> : null}
      <WaterTipsBox catches={catches} label={t("What it takes")} within={exactTerm("species", t(name))} />
      <CopySummary text={() => speciesSummary(name, catches, waters)} file="stillwater-species.txt" />
      <BestGrowth catches={catches} />
      <LengthAndWeight catches={catches} />
      <div className="section-head">
        <h2>{t("Where it comes from")}</h2>
      </div>
      <ul className="species-waters">
        {waters.map((water) => (
          <li key={water.spotId}>
            {water.name ? <Link to={`/spots/${water.spotId}`}>{water.name}</Link> : t("Unknown water")}
            <span className="meta">
              {/* The count opens just those fish, through the catch search. */}
              {water.name ? <Link to={findWithLink(exactTerm("species", t(name)), exactTerm("water", water.name))}>{fishCountLabel(water.count)}</Link> : fishCountLabel(water.count)}
            </span>
          </li>
        ))}
      </ul>
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("When it bites")}</h2>
          </div>
          <TallyBars rows={biteTimes({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(exactTerm("species", t(name)), exactTerm("time", t(row.label))) : undefined }))} />
        </>
      ) : null}
      {seasons.filter((row) => row.count > 0).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By season")}</h2>
          </div>
          <TallyBars rows={seasons.map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(exactTerm("species", t(name)), exactTerm("season", t(row.label))) : undefined }))} />
        </>
      ) : null}
      {catches.filter((entry) => entry.weather).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By the weather")}</h2>
          </div>
          <TallyBars rows={skyTally({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(exactTerm("species", t(name)), exactTerm("sky", t(row.label))) : undefined }))} />
        </>
      ) : null}
      <WeatherBars book={{ ...book, catches }} within={exactTerm("species", t(name))} />
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By the moon")}</h2>
          </div>
          <TallyBars rows={moonTally({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(exactTerm("species", t(name)), exactTerm("moon", t(row.label))) : undefined }))} />
        </>
      ) : null}
      {lureTally({ ...book, catches }).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("Lures that took it")}</h2>
          </div>
          {/* Each lure opens just this kind's fish on it. */}
          <TallyBars rows={lureTally({ ...book, catches }).map((row) => ({ key: row.lure, label: t(row.lure), count: row.count, to: findWithLink(exactTerm("species", t(name)), exactTerm("lure", t(row.lure))) }))} />
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
      <RenameKind field="species" name={name} />
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

/** A gain in size, with a place more than a size shows, so a small step does not read "+0 cm" or "+0 lb". */
function gainText(gain: Measure): string {
  const metric = getUnits() === "metric";
  if (gain.kind === "length") return metric ? `${num(gain.inches * CM_PER_IN, 1)} cm` : `${num(gain.inches, 2)} in`;
  return metric ? `${num(gain.pounds * KG_PER_LB, 2)} kg` : `${num(gain.pounds, 2)} lb`;
}

/** The fish of the kind that were both measured and weighed, shortest first: how weight goes with length. */
function LengthAndWeight({ catches }: { catches: readonly CatchEntry[] }) {
  const pairs = sizePairs(catches);
  if (pairs.length === 0) return null;
  return (
    <>
      <div className="section-head">
        <h2>{t("Length and weight")}</h2>
      </div>
      <ol className="species-waters best-steps" aria-label={t("Length and weight")}>
        {pairs.map(({ entry, inches, pounds }) => (
          <li key={entry.id}>
            <Link to={`/catches/${entry.id}`}>{`${lengthText(inches)} · ${weightText(pounds)}`}</Link>
            <span className="meta">{formatCatchDay(entry.caughtAt)}</span>
          </li>
        ))}
      </ol>
    </>
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
      {lists.map((steps) => {
        const label = steps[0]!.measure.kind === "length" ? t("By length") : t("By weight");
        return (
          <Fragment key={steps[0]!.measure.kind}>
            {/* Both measures have a story: each list says which it is. */}
            {lists.length > 1 ? <h3 className="subhead">{label}</h3> : null}
            <ol className="species-waters best-steps" aria-label={label}>
              {steps.map(({ entry, measure, gain }) => (
                <li key={entry.id}>
                  <Link to={`/catches/${entry.id}`}>{measureText(measure)}</Link>
                  <span className="meta">
                    {formatCatchDay(entry.caughtAt)}
                    {gain ? ` · +${gainText(gain)}` : ` · ${t("the first")}`}
                  </span>
                </li>
              ))}
            </ol>
          </Fragment>
        );
      })}
    </>
  );
}
