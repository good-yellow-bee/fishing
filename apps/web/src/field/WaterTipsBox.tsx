import { Fragment } from "react";
import { Link } from "react-router-dom";
import { SEASON_LABELS, SKY_LABELS, type CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { findLink } from "./CatchSearch";
import { waterTips } from "./waterTips";
import { thisWeekInPastYears } from "./yearsAgo";
import { fishCountLabel } from "./format";
import { speciesCounts } from "./speciesLink";

/**
 * "What works here": a water's best lures and busiest time of day, once it has a few fish.
 * Given an outing's day (`on`, YYYY-MM-DD), it also says what the same week gave in earlier years.
 */
export function WaterTipsBox({ catches, label, on }: { catches: readonly CatchEntry[]; label?: string; on?: string }) {
  useT();
  const heading = label ?? t("What works here");
  const tips = waterTips(catches);
  if (!tips) return null;
  const [y, m, d] = (on ?? "").split("-").map(Number);
  const pastWeek = y && m && d ? thisWeekInPastYears(catches, new Date(y, m - 1, d, 12), 3, Infinity) : [];
  return (
    <aside className="conditions water-tips" aria-label={heading}>
      <span className="eyebrow">{heading}</span>
      <p>
        {tips.lures.map((row, index) => (
          <Fragment key={row.lure}>
            {index > 0 ? " · " : null}
            <Link to={findLink(t(row.lure))}>{t(row.lure)}</Link> ({row.count})
          </Fragment>
        ))}
        {tips.time ? (
          <>
            <br />
            {t("Most fish at: {time}", { time: t(tips.time.label) })}
          </>
        ) : null}
        {tips.sky ? (
          <>
            <br />
            {t("Best weather: {sky}", { sky: t(SKY_LABELS[tips.sky]) })}
          </>
        ) : null}
        {tips.season ? (
          <>
            <br />
            {t("Best season: {season}", { season: t(SEASON_LABELS[tips.season]) })}
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
