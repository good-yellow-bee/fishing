import { Fragment } from "react";
import { Link } from "react-router-dom";
import { SEASON_LABELS, SKY_LABELS, type CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { findLink } from "./CatchSearch";
import { waterTips } from "./waterTips";

/** "What works here": a water's best lures and busiest time of day, once it has a few fish. */
export function WaterTipsBox({ catches, label }: { catches: readonly CatchEntry[]; label?: string }) {
  useT();
  const heading = label ?? t("What works here");
  const tips = waterTips(catches);
  if (!tips) return null;
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
      </p>
    </aside>
  );
}
