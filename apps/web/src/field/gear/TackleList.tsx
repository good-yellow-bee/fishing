import { useState, type FormEvent } from "react";
import { itemsForTrip, packedCount } from "@stillwater/shared";
import { useTackle } from "./TackleState";
import "./gear.css";

export function TackleList({ tripId, heading }: { tripId: string; heading?: string }) {
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

  const count =
    rows.length === 0 ? "Nothing packed" : `${packed} of ${rows.length} packed`;

  return (
    <section className="tackle-block" aria-label={heading ?? "Tackle"}>
      {heading ? (
        <div className="section-head">
          <h2>{heading}</h2>
          <span className="tackle-count">{count}</span>
        </div>
      ) : (
        <p className="tackle-count">{count}</p>
      )}
      {rows.length === 0 ? (
        <p className="empty">Nothing on this list yet.</p>
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
                <span className={item.packed ? "is-packed" : undefined}>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form className="tackle-add" onSubmit={onSubmit}>
        <label>
          Add a piece
          <input
            name="piece"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Spare leader"
            maxLength={60}
          />
        </label>
        <button type="submit">Add</button>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
