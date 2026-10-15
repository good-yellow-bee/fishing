import type { CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
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
        {tips.lures.map((row) => `${t(row.lure)} (${row.count})`).join(" · ")}
        {tips.time ? (
          <>
            <br />
            {t("Most fish at: {time}", { time: t(tips.time.label) })}
          </>
        ) : null}
      </p>
    </aside>
  );
}
