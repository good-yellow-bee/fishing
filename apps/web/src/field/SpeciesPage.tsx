import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { FISH, biteTimes, lureTally, measureOf, moonTally, seasonTally, sizePairs, skyTally, type CatchEntry, type Measure } from "@stillwater/shared";
import { getUnits, num, t, tn, useT } from "../i18n";
import { CatchCard } from "./cards";
import { FishSum } from "./FishSum";
import { FishCsv } from "./FishCsv";
import { fishCountLabel, formatCatchDay, outingNameById } from "./format";
import { useLogbook } from "./LogbookState";
import { PagedCatches } from "./PagedCatches";
import { catchMonth } from "./tripMonths";
import { catchesOfSpecies, kindOnPage, speciesWaters } from "./speciesLink";
import { withoutPlayLake } from "./playLake";
import { TallyBars } from "./TallyBars";
import { exactTerm, findWithLink } from "./findLinks";
import { WaterTipsBox, waterRange } from "./WaterTipsBox";
import { bestSteps, type BestStep } from "./bestSteps";
import { CM_PER_IN, KG_PER_LB, lengthText, measureText, measuresText, weightText } from "../i18n/content";
import { WeatherBars } from "./WeatherBars";
import { MonthBars } from "./MonthBars";
import { CopySummary } from "./CopySummary";
import { speciesSummary } from "./summaries";
import { RenameKind } from "./RenameKind";
import { seasonFirst } from "./seasonFirst";
import { countedFish } from "./milestones";
import { newWatersThisYear } from "./bests/notYet";
import { sizeBands, typicalByYear, typicalSize } from "./sizeBands";
import { BiggestLinks } from "./BiggestHere";
import { catchLink, type ListKey } from "./catchList";

/** One kind of fish across the whole book: how many, how big, on what, and where. */
/** How many of the kind's newest photos show here; the rest are a search away. */
const PHOTOS_SHOWN = 4;

/**
 * Pictures of some fish, newest first, each opening its fish; more than a few open in the catch search within `within`
 * (a kind or a water). `named` puts each fish's kind in its caption, for a strip of mixed kinds.
 */
/** `list` is the list each photo's fish steps through. */
export function PhotoStrip({ catches, within, named = false, list }: { catches: readonly CatchEntry[]; within: string; named?: boolean; list?: ListKey }) {
  const { photoFor } = useLogbook();
  const pictured = catches.filter((entry) => photoFor(entry.id));
  if (pictured.length === 0) return null;
  return (
    <section>
      <div className="section-head">
        <h2>{t("Photos")}</h2>
        {pictured.length > PHOTOS_SHOWN ? (
          <Link to={findWithLink(within, t("Photo").toLowerCase())}>{tn(pictured.length, "{n} photo", "{n} photos")}</Link>
        ) : null}
      </div>
      <ul className="photo-wall species-photos">
        {pictured.slice(0, PHOTOS_SHOWN).map((entry) => (
          <li key={entry.id}>
            <Link to={catchLink(entry.id, list)}>
              <img src={photoFor(entry.id)!} alt="" loading="lazy" />
              <span className="photo-caption">
                {named ? <strong>{t(entry.species)}</strong> : null}
                <small>
                  {measuresText(entry)} · {formatCatchDay(entry.caughtAt)}
                </small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The biggest fish of the kind on one lure, by the measure most of the kind were taken in: "best 32 in". */
function lureBest(catches: readonly CatchEntry[], lure: string): string | undefined {
  const lengths = catches.filter((entry) => measureOf(entry, "length")).length;
  const kind: Measure["kind"] = lengths * 2 >= catches.length ? "length" : "weight";
  const want = lure.trim().replace(/\s+/g, " ").toLowerCase();
  let best: Measure | null = null;
  for (const entry of catches) {
    if (entry.lure.trim().replace(/\s+/g, " ").toLowerCase() !== want) continue;
    const measure = measureOf(entry, kind);
    if (!measure) continue;
    const size = (m: Measure) => (m.kind === "length" ? m.inches : m.pounds);
    if (!best || size(measure) > size(best)) best = measure;
  }
  return best ? t("best {size}", { size: measureText(best) }) : undefined;
}

/** "Up 2 in since 2023.": the first year with enough fish against the last, or nothing when they read the same. */
function sizeChange(first: { year: string; size: Measure }, last: { year: string; size: Measure }): string {
  if (measureText(first.size) === measureText(last.size)) return "";
  const amount = (measure: Measure) => (measure.kind === "length" ? measure.inches : measure.pounds);
  return amount(last.size) > amount(first.size)
    ? t("Up {size} since {year}.", { size: gainText(first.size, last.size), year: first.year })
    : t("Down {size} since {year}.", { size: gainText(last.size, first.size), year: first.year });
}

export function SpeciesPage() {
  const { book } = useLogbook();
  useT();
  const { species = "" } = useParams();
  // The angler's own fish of the kind, as Bests counts them; a kind only ever caught in the game shows its game fish.
  const every = catchesOfSpecies(book, species);
  const catches = kindOnPage(book, species);
  const name = catches[0]?.species ?? species;
  // Its searches leave the game's lake out when the page does, so each count opens the fish it counted.
  const kindTerm = catches.length < every.length ? withoutPlayLake(book, exactTerm("species", t(name)), every) : exactTerm("species", t(name));
  const titleOf = (tripId: string | null) => (tripId ? outingNameById(book, tripId) : null);

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
      <SeasonFirst catches={catches} />
      <NewWaters catches={catches} name={name} waters={waters} />
      {/* The water the kind came in, once two fish noted it: where to look for it. */}
      {/* The angler's own: the sample week's temperatures would widen it. */}
      {countedFish(catches).filter((entry) => entry.weather?.waterTempF !== undefined).length >= 2 && waterRange(countedFish(catches)) ? (
        <p className="meta water-range">{t("Caught in water of {temp}.", { temp: waterRange(countedFish(catches))! })}</p>
      ) : null}
      <WaterTipsBox catches={catches} label={t("What it takes")} within={kindTerm} />
      <CopySummary text={() => speciesSummary(name, catches, waters)} file="stillwater-species.txt" />
      <BestGrowth catches={catches} />
      <LengthAndWeight catches={catches} />
      <PhotoStrip catches={catches} within={kindTerm} list={`species:${species}`} />
      <div className="section-head">
        <h2>{t("Where it comes from")}</h2>
      </div>
      <ul className="species-waters">
        {waters.map((water) => (
          <li key={water.spotId}>
            {water.name ? <Link to={`/spots/${water.spotId}`}>{water.name}</Link> : t("Unknown water")}
            <span className="meta sizes">
              {/* The count opens just those fish, through the catch search. */}
              {water.name ? <Link to={findWithLink(kindTerm, exactTerm("water", water.name))}>{fishCountLabel(water.count)}</Link> : fishCountLabel(water.count)}
              {/* Beside each water, its biggest of the kind, once there is more than one water to set side by side. */}
              {waters.length > 1 ? (
                <>
                  {"\u00a0· "}
                  <BiggestLinks catches={catches.filter((entry) => entry.spotId === water.spotId)} list={`species:${species}`} about={`${t(name)}, ${water.name ?? t("Unknown water")}`} />
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <TypicalByWater catches={countedFish(catches)} waters={waters} />
      <SizeSpread catches={countedFish(catches)} name={name} />
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("When it bites")}</h2>
          </div>
          <TallyBars key={species} rows={biteTimes({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(kindTerm, exactTerm("time", t(row.label))) : undefined }))} />
        </>
      ) : null}
      {seasons.filter((row) => row.count > 0).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By season")}</h2>
          </div>
          <TallyBars key={species} rows={seasons.map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(kindTerm, exactTerm("season", t(row.label))) : undefined }))} />
        </>
      ) : null}
      <MonthBars key={`months-${species}`} catches={catches} within={kindTerm} />
      {catches.filter((entry) => entry.weather).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By the weather")}</h2>
          </div>
          <TallyBars key={species} rows={skyTally({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(kindTerm, exactTerm("sky", t(row.label))) : undefined }))} />
        </>
      ) : null}
      <WeatherBars key={species} book={{ ...book, catches }} within={kindTerm} />
      {catches.length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("By the moon")}</h2>
          </div>
          <TallyBars key={species} rows={moonTally({ ...book, catches }).map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? findWithLink(kindTerm, exactTerm("moon", t(row.label))) : undefined }))} />
        </>
      ) : null}
      {lureTally({ ...book, catches }).length > 1 ? (
        <>
          <div className="section-head">
            <h2>{t("Lures that took it")}</h2>
          </div>
          {/* Each lure opens just this kind's fish on it. */}
          <TallyBars key={species} rows={lureTally({ ...book, catches }).map((row) => ({ key: row.lure, label: t(row.lure), count: row.count, to: findWithLink(kindTerm, exactTerm("lure", t(row.lure))), note: lureBest(catches, row.lure) }))} />
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
            list={`species:${species}`}
          />
        )}
      </PagedCatches>
      <RenameKind field="species" name={name} />
    </div>
  );
}

/** How the kind's fish spread by length and by weight, each band opening its fish, and how many went back. */
function SizeSpread({ catches, name }: { catches: readonly CatchEntry[]; name: string }) {
  const metric = getUnits() === "metric";
  const within = exactTerm("species", t(name));
  const released = catches.filter((entry) => entry.released).length;
  const charts = (["length", "weight"] as const)
    .map((kind) => ({ kind, bands: sizeBands(catches, kind, metric), years: typicalByYear(catches, kind) }))
    .filter((chart) => chart.bands.length > 0)
    .map((chart) => ({ ...chart, change: chart.years.length > 1 ? sizeChange(chart.years[0]!, chart.years[chart.years.length - 1]!) : "" }));
  if (charts.length === 0) return null;
  const size = (value: number, unit: string) => `${num(value, 2)} ${unit}`;
  return (
    <>
      <div className="section-head">
        <h2>{t("By size")}</h2>
      </div>
      {released > 0 ? (
        <p className="meta released-share">
          <Link to={findWithLink(within, t("Released"))}>{t("Released: {count} of {total}", { count: released, total: catches.length })}</Link>
        </p>
      ) : null}
      {charts.map((chart) => (
        <Fragment key={chart.kind}>
          <p className="meta typical-size">{t("Typical size: {size} (as many bigger as smaller)", { size: measureText(typicalSize(catches, chart.kind)!) })}</p>
          {/* Two years or more with enough fish: whether they are getting bigger. */}
          {chart.years.length > 1 ? (
            <p className="meta typical-years">
              {t("Typical size by year: {years}", { years: chart.years.map((row) => `${row.year}: ${measureText(row.size)}`).join(" · ") })}
              {/* The list has no full stop of its own: one goes in only before the change. */}
              {chart.change ? `. ${chart.change}` : null}
            </p>
          ) : null}
          <TallyBars
          rows={chart.bands.map((band) => ({
            key: `${chart.kind}-${band.from}`,
            label: t("{from} to {to}", { from: size(band.from, band.unit), to: size(band.to, band.unit) }),
            count: band.count,
            to: band.count > 0 ? findWithLink(within, band.search) : undefined,
          }))}
          />
        </Fragment>
      ))}
    </>
  );
}

/** "Typical size by water: Cedar Lake: 29 in · Mill Pond: 24 in", biggest first, once two waters have enough fish measured. */
function TypicalByWater({ catches, waters }: { catches: readonly CatchEntry[]; waters: readonly { spotId: string; name?: string | null }[] }) {
  const lengths = catches.filter((entry) => measureOf(entry, "length")).length;
  const kind = lengths * 2 >= catches.length ? "length" : "weight";
  const rows = waters.flatMap((water) => {
    const size = water.name ? typicalSize(catches.filter((entry) => entry.spotId === water.spotId), kind) : null;
    return size && water.name ? [{ name: water.name, size }] : [];
  });
  if (rows.length < 2) return null;
  const amount = (measure: Measure) => (measure.kind === "length" ? measure.inches : measure.pounds);
  rows.sort((a, b) => amount(b.size) - amount(a.size));
  return <p className="meta typical-waters">{t("Typical size by water: {waters}", { waters: rows.map((row) => `${row.name}: ${measureText(row.size)}`).join(" · ") })}</p>;
}

/** "New waters this year: Cedar Lake": where the kind turned up somewhere it hadn't before, each opening those fish. */
function NewWaters({ catches, name, waters }: { catches: readonly CatchEntry[]; name: string; waters: readonly { spotId: string; name?: string | null }[] }) {
  const found = newWatersThisYear(catches).flatMap((id) => waters.filter((water) => water.spotId === id && water.name));
  if (found.length === 0) return null;
  return (
    <p className="meta new-waters">
      <span>
        {t("New waters this year:")}{" "}
        {found.map((water, index) => (
          <Fragment key={water.spotId}>
            {index > 0 ? ", " : null}
            <Link to={findWithLink(exactTerm("species", t(name)), exactTerm("water", water.name!))}>{water.name}</Link>
          </Fragment>
        ))}
      </span>
    </p>
  );
}

/** "First of 2026: Apr 3, 9 days earlier than in 2025.": whether the kind turned up sooner this year. */
function SeasonFirst({ catches }: { catches: readonly CatchEntry[] }) {
  const found = seasonFirst(countedFish(catches));
  if (!found) return null;
  const vars = { year: found.year, last: found.year - 1 };
  const gap = Math.abs(found.earlier);
  const [before, after] = (
    found.earlier > 0
      ? tn(gap, "First of {year}: {day}, {n} day earlier than in {last}.", "First of {year}: {day}, {n} days earlier than in {last}.", { ...vars, day: "\u0000" })
      : found.earlier < 0
        ? tn(gap, "First of {year}: {day}, {n} day later than in {last}.", "First of {year}: {day}, {n} days later than in {last}.", { ...vars, day: "\u0000" })
        : t("First of {year}: {day}, the same day as in {last}.", { ...vars, day: "\u0000" })
  ).split("\u0000");
  return (
    <p className="meta season-first">
      {/* One run of text: the paragraph lays its children out as separate items. */}
      <span>
        {before}
        <Link to={`/catches/${found.entry.id}`}>{formatCatchDay(found.entry.caughtAt)}</Link>
        {after}
      </span>
    </p>
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

/**
 * How much a step added, worked out from the two sizes as the page shows them, so "57 cm → 71 cm" reads "+14 cm"
 * rather than the exact inches' "+13,5 cm". Two sizes that show the same give the exact gain with a place more,
 * so a small step does not read "+0 cm".
 */
function gainText(from: Measure, to: Measure): string {
  const metric = getUnits() === "metric";
  // The digits measureText shows for a size: whole cm, a tenth of an inch, and an extra place under 1 lb or 1 kg.
  const shown = (measure: Measure): [number, number] => {
    if (measure.kind === "length") return metric ? [measure.inches * CM_PER_IN, 0] : [measure.inches, 1];
    const value = metric ? measure.pounds * KG_PER_LB : measure.pounds;
    return [value, value < 1 ? 2 : 1];
  };
  const [a, aDigits] = shown(from);
  const [b, bDigits] = shown(to);
  const digits = Math.max(aDigits, bDigits);
  const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;
  const diff = round(b, bDigits) - round(a, aDigits);
  const unit = to.kind === "length" ? (metric ? "cm" : "in") : metric ? "kg" : "lb";
  if (round(diff, digits) > 0) return `${num(diff, digits)} ${unit}`;
  let places = digits + 1;
  while (places < 4 && round(b - a, places) <= 0) places += 1;
  return `${num(b - a, places)} ${unit}`;
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
              {steps.map(({ entry, measure, gain }, index) => (
                <li key={entry.id}>
                  <Link to={`/catches/${entry.id}`}>{measureText(measure)}</Link>
                  <span className="meta">
                    {formatCatchDay(entry.caughtAt)}
                    {gain && index > 0 ? ` · +${gainText(steps[index - 1]!.measure, measure)}` : ` · ${t("the first")}`}
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
