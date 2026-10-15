import { useState, type FormEvent } from "react";
import { isLureLabel, itemsForTrip, lureClass, packedCount } from "@stillwater/shared";
import { useT } from "../../i18n";
import { messageText } from "../format";
import { useTackle } from "./TackleState";
import "./gear.css";

/** `name` tells screen readers which list this is where several sit on one page; it defaults to the heading. */
/** `suggest` offers lures to add in one tap (those already on the list are left out). */
export function TackleList({
  tripId,
  heading,
  name,
  suggest = [],
}: {
  tripId: string;
  heading?: string;
  name?: string;
  suggest?: readonly string[];
}) {
  const t = useT();
  const { items, toggle, add } = useTackle();
  const rows = itemsForTrip(items, tripId);
  const packed = packedCount(rows);
  const onList = new Set(rows.map((item) => item.label.trim().toLowerCase()));
  const missing = suggest.filter((lure) => !onList.has(lure.trim().toLowerCase()));
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const message = add(tripId, label);
    if (message) {
      setError(message);
      return;
    }
    setLabel("");
    setError("");
  };

  const count = rows.length === 0 ? t("Nothing packed") : t("{packed} of {total} packed", { packed, total: rows.length });

  return (
    <section className="tackle-block" aria-label={name ?? heading ?? t("Tackle")}>
      {heading ? (
        <div className="section-head">
          <h2>{heading}</h2>
          <span className="tackle-count">{count}</span>
        </div>
      ) : (
        <p className="tackle-count">{count}</p>
      )}
      {rows.length === 0 ? (
        <p className="empty">{t("Nothing on this list yet.")}</p>
      ) : (
        <ul className="tackle-list">
          {rows.map((item) => (
            <li key={item.id}>
              <label className="tackle-row">
                <input
                  type="checkbox"
                  checked={item.packed}
                  onChange={(event) => toggle(item.id, event.target.checked)}
                />
                <span className={item.packed ? "is-packed" : undefined}>{t(item.label)}</span>
                {isLureLabel(item.label) && <span className="lure-tag">{t(lureClass(item.label).label)}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 ? (
        <p className="form-note lure-tips tackle-suggest">
          {t("Works on this water:")}{" "}
          {missing.map((lure) => (
            <button key={lure} type="button" className="lure-tip" onClick={() => setError(add(tripId, lure) ?? "")}>
              {t("+ {lure}", { lure: t(lure) })}
            </button>
          ))}
        </p>
      ) : null}
      <form className="tackle-add" onSubmit={onSubmit}>
        <label>
          {t("Add a piece")}
          <input
            name="piece"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("Spare leader")}
            maxLength={60}
          />
        </label>
        <button type="submit">{t("Add")}</button>
        {error ? (
          <p className="field-error" role="alert">
            {messageText(error)}
          </p>
        ) : null}
      </form>
    </section>
  );
}
