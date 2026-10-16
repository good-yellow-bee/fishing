import { Fragment } from "react";
import { Link } from "react-router-dom";
import { SEASON_LABELS, SKY_LABELS, type CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { exactTerm, findLink, findWithLink } from "./CatchSearch";
import { waterTips } from "./waterTips";
import { thisWeekInPastYears } from "./yearsAgo";
import { fishCountLabel, formatCatchDay } from "./format";
import { tempText } from "../i18n/content";
import { tempBandLabel, tempBandSearch } from "./WeatherBars";
import { nearSunCount } from "./sunLight";
import { speciesCounts } from "./speciesLink";

/** A tip line such as "Best weather: {sky}", with the named value linked to the catch search for it. */
function TipLine({ text, name, value, to }: { text: string; name: string; value: string; to: string }) {
  const [before, after] = t(text, { [name]: "\u0000" }).split("\u0000");
  return (
    <>
      <br />
      {before}
      <Link to={to}>{value}</Link>
      {after}
    </>
  );
}

/**
 * "What works here": a water's best lures and busiest time of day, once it has a few fish.
 * Given an outing's day (`on`, YYYY-MM-DD), it also says the last water temperature noted and what the same week gave in
 * earlier years.
 */
export function WaterTipsBox({
  catches,
  label,
  on,
  within,
  place,
}: {
  catches: readonly CatchEntry[];
  label?: string;
  on?: string;
  within?: string;
  /** The water's place, for one water's box: then it says how many fish came around sunrise or sunset. */
  place?: { lat: number; lng: number };
}) {
  useT();
  const heading = label ?? t("What works here");
  const tips = waterTips(catches);
  if (!tips) return null;
  // Links narrow to the same water or kind of fish (`within`) when the box is about one.
  const find = (text: string) => (within ? findWithLink(within, text) : findLink(text));
  const [y, m, d] = (on ?? "").split("-").map(Number);
  const sun = place ? nearSunCount(catches, place) : null;
  const pastWeek = y && m && d ? thisWeekInPastYears(catches, new Date(y, m - 1, d, 12), 3, Infinity) : [];
  return (
    <aside className="conditions water-tips" aria-label={heading}>
      <span className="eyebrow">{heading}</span>
      <p>
        {tips.lures.map((row, index) => (
          <Fragment key={row.lure}>
            {index > 0 ? " · " : null}
            <Link to={find(exactTerm("lure", t(row.lure)))}>{t(row.lure)}</Link> ({row.count})
          </Fragment>
        ))}
        {tips.time ? <TipLine text="Most fish at: {time}" name="time" value={t(tips.time.label)} to={find(exactTerm("time", t(tips.time.label)))} /> : null}
        {tips.sky ? <TipLine text="Best weather: {sky}" name="sky" value={t(SKY_LABELS[tips.sky])} to={find(exactTerm("sky", t(SKY_LABELS[tips.sky])))} /> : null}
        {tips.season ? <TipLine text="Best season: {season}" name="season" value={t(SEASON_LABELS[tips.season])} to={find(exactTerm("season", t(SEASON_LABELS[tips.season])))} /> : null}
        {tips.temp ? <TipLine text="Best water temperature: {temp}" name="temp" value={tempBandLabel(tips.temp)} to={find(tempBandSearch(tips.temp))} /> : null}
        {sun && sun.near >= 2 ? (
          <>
            <br />
            {t("Within an hour of sunrise or sunset: {count} of {total} fish.", { count: sun.near, total: sun.total })}
          </>
        ) : null}
        {on && tips.lastTemp ? (
          <>
            <br />
            {t("Last water temperature noted: {temp} on {day}.", { temp: tempText(tips.lastTemp.fahrenheit), day: formatCatchDay(tips.lastTemp.at) })}
          </>
        ) : null}
        {pastWeek.length > 0 ? (
          <>
            <br />
            {t("This week in earlier years here: {fish}, {species}.", {
              fish: fishCountLabel(pastWeek.length),
              species: speciesCounts(pastWeek)
                .map((row) => t(row.species))
                .join(", "),
            })}
          </>
        ) : null}
      </p>
    </aside>
  );
}
