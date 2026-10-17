import { useState } from "react";
import { Link } from "react-router-dom";
import { t, useT } from "../i18n";
import { fishCountLabel } from "./format";

/** `note` is a short line under the label, such as the best fish of the row. */
type TallyRow = { key: string; label: string; count: number; to?: string; note?: string };

/** A count per row with a bar drawn to scale; the bar is for the eye, the words carry the number. `limit`: the rows shown until asked for more. */
export function TallyBars({ rows, limit }: { rows: TallyRow[]; limit?: number }) {
  useT();
  const [all, setAll] = useState(false);
  const most = Math.max(1, ...rows.map((row) => row.count));
  const empty = rows.filter((row) => row.count === 0).length;
  // A few fish leave most rows at "None": those fold away until asked for, so the counts that matter stand out.
  const fold = empty >= 3 && empty * 2 > rows.length;
  const cut = !fold && limit !== undefined && rows.length > limit;
  const shown = fold && !all ? rows.filter((row) => row.count > 0) : cut && !all ? rows.slice(0, limit) : rows;
  return (
    <>
      <ol className="tally-bars">
        {shown.map((row) => (
          <li key={row.key} data-empty={row.count === 0 ? "1" : "0"}>
            <span className="tally-label">
              {row.to ? <Link to={row.to}>{row.label}</Link> : row.label}
              {row.note ? <small className="tally-note">{row.note}</small> : null}
            </span>
            <span className="tally-bar" aria-hidden="true">
              <span style={{ width: `${(row.count / most) * 100}%` }} />
            </span>
            <span className="tally-count">{row.count === 0 ? t("None") : fishCountLabel(row.count)}</span>
          </li>
        ))}
      </ol>
      {cut ? (
        <p className="tally-more">
          <button type="button" className="text-button" aria-expanded={all} onClick={() => setAll((open) => !open)}>
            {all ? t("Show fewer") : t("Show all {count}", { count: rows.length })}
          </button>
        </p>
      ) : null}
      {fold ? (
        <p className="tally-more">
          <button type="button" className="text-button" aria-expanded={all} onClick={() => setAll((open) => !open)}>
            {all ? t("Hide the empty rows") : t("Show all {count}", { count: rows.length })}
          </button>
        </p>
      ) : null}
    </>
  );
}
