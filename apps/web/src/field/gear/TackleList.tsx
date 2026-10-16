import { useId, useState, type FormEvent } from "react";
import { isLureLabel, itemsForTrip, lureClass, packedCount, type CatchEntry } from "@stillwater/shared";
import { useT } from "../../i18n";
import { fishCountLabel, messageText } from "../format";
import { useTackle } from "./TackleState";
import "./gear.css";

/** "Woolly buggers" on the list and "Woolly bugger" on the catch are the same piece. */
function pieceKey(label: string): string {
  return label.trim().toLowerCase().replace(/s$/, "");
}

/** `name` tells screen readers which list this is where several sit on one page; it defaults to the heading. */
/** `suggest` offers lures to add in one tap (those already on the list are left out). */
/** `caught` is the outing's fish: a piece named like the lure that took some says how many. */
export function TackleList({
  tripId,
  heading,
  name,
  suggest = [],
  caught = [],
}: {
  tripId: string;
  heading?: string;
  name?: string;
  suggest?: readonly string[];
  caught?: readonly CatchEntry[];
}) {
  const t = useT();
  const { items, toggle, add, remove, unpackTrip } = useTackle();
  const rows = itemsForTrip(items, tripId);
  const packed = packedCount(rows);
  const onList = new Set(rows.map((item) => item.label.trim().toLowerCase()));
  const missing = suggest.filter((lure) => !onList.has(lure.trim().toLowerCase()));
  const took = new Map<string, number>();
  for (const entry of caught) took.set(pieceKey(entry.lure), (took.get(pieceKey(entry.lure)) ?? 0) + 1);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const errorId = useId();

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

  const count =
    rows.length === 0
      ? t("Nothing packed")
      : packed === rows.length
        ? t("All packed")
        : t("{packed} of {total} packed", { packed, total: rows.length });
  // After an outing, the same list can go back in the bag for the next one.
  const unpack =
    packed > 0 ? (
      <button type="button" className="text-button tackle-unpack" onClick={() => unpackTrip(tripId)}>
        {t("Unpack all")}
      </button>
    ) : null;

  return (
    <section className="tackle-block" aria-label={name ?? heading ?? t("Tackle")}>
      {heading ? (
        <div className="section-head">
          <h2>{heading}</h2>
          <span className="tackle-count">
            {count}
            {unpack}
          </span>
        </div>
      ) : (
        <p className="tackle-count">
          {count}
          {unpack}
        </p>
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
                {took.get(pieceKey(item.label)) ? <span className="tackle-caught">{fishCountLabel(took.get(pieceKey(item.label))!)}</span> : null}
              </label>
              <button
                type="button"
                className="tackle-remove"
                onClick={() => remove(item.id)}
                aria-label={t("Take {piece} off the list", { piece: t(item.label) })}
              >
                ×
              </button>
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
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        <button type="submit">{t("Add")}</button>
        {error ? (
          <p className="field-error" role="alert" id={errorId}>
            {messageText(error)}
          </p>
        ) : null}
      </form>
    </section>
  );
}
