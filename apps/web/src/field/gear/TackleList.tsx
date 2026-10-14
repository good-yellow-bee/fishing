import { useState, type FormEvent } from "react";
import { isLureLabel, itemsForTrip, lureClass, packedCount } from "@stillwater/shared";
import { useT } from "../../i18n";
import { messageText } from "../format";
import { useTackle } from "./TackleState";
import "./gear.css";

export function TackleList({ tripId, heading }: { tripId: string; heading?: string }) {
  const t = useT();
  const { items, toggle, add } = useTackle();
  const rows = itemsForTrip(items, tripId);
  const packed = packedCount(rows);
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
    <section className="tackle-block" aria-label={heading ?? t("Tackle")}>
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
