import { t } from "../i18n";
import { fishCountLabel } from "./format";

/** A count per row with a bar drawn to scale; the bar is for the eye, the words carry the number. */
export function TallyBars({ rows }: { rows: Array<{ key: string; label: string; count: number }> }) {
  const most = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ol className="tally-bars">
      {rows.map((row) => (
        <li key={row.key} data-empty={row.count === 0 ? "1" : "0"}>
          <span className="tally-label">{row.label}</span>
          <span className="tally-bar" aria-hidden="true">
            <span style={{ width: `${(row.count / most) * 100}%` }} />
          </span>
          <span className="tally-count">{row.count === 0 ? t("None") : fishCountLabel(row.count)}</span>
        </li>
      ))}
    </ol>
  );
}
