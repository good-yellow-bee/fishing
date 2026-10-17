import { useId, useRef, useState, type FormEvent } from "react";
import { isLureLabel, itemsForTrip, lureClass, packedCount, type CatchEntry, type TackleItem, type Trip } from "@stillwater/shared";
import { useT } from "../../i18n";
import { fishCountLabel, formatDay, messageText, outingName } from "../format";
import { useTackle } from "./TackleState";
import { packingText } from "./packingText";
import { CopySummary } from "../CopySummary";
import { pieceKey } from "./pieceKey";
import "./gear.css";

/**
 * The outing whose bag this one most likely repeats: the latest with a list, on or before this one's day when there is
 * one, and on the same water ahead of any other.
 */
export function lastPackedTrip(trips: readonly Trip[], items: readonly TackleItem[], tripId: string): Trip | null {
  const listed = new Set(items.map((item) => item.tripId));
  const self = trips.find((trip) => trip.id === tripId);
  const day = self?.date ?? "9999-12-31";
  const others = trips.filter((trip) => trip.id !== tripId && listed.has(trip.id)).sort((a, b) => b.date.localeCompare(a.date));
  const pick = (from: readonly Trip[]) => from.find((trip) => trip.date <= day) ?? from[0] ?? null;
  return pick(others.filter((trip) => trip.spotId === self?.spotId)) ?? pick(others);
}

/** `name` tells screen readers which list this is where several sit on one page; it defaults to the heading. */
/** `suggest` offers lures to add in one tap (those already on the list are left out). */
/** `caught` is the outing's fish: a piece named like the lure that took some says how many. */
/** `trips` is the book's outings: an empty list offers the bag of the last one that had a list. */
export function TackleList({
  tripId,
  heading,
  name,
  suggest = [],
  caught = [],
  trips = [],
}: {
  tripId: string;
  heading?: string;
  name?: string;
  suggest?: readonly string[];
  caught?: readonly CatchEntry[];
  trips?: readonly Trip[];
}) {
  const t = useT();
  const { items, toggle, add, remove, unpackTrip, copyTrip } = useTackle();
  const rows = itemsForTrip(items, tripId);
  const lastBag = rows.length === 0 ? lastPackedTrip(trips, items, tripId) : null;
  const packed = packedCount(rows);
  const onList = new Set(rows.map((item) => pieceKey(item.label)));
  const missing = suggest.filter((lure) => !onList.has(pieceKey(lure)));
  const took = new Map<string, number>();
  for (const entry of caught) took.set(pieceKey(entry.lure), (took.get(pieceKey(entry.lure)) ?? 0) + 1);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const errorId = useId();
  const box = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // A control that takes itself away (a copied list, an added tip, the last unpack, a removed row) hands focus on.
  const focusAfter = (removedIndex?: number) => {
    setTimeout(() => {
      const removers = box.current?.querySelectorAll<HTMLButtonElement>(".tackle-remove") ?? [];
      const next = removedIndex === undefined ? undefined : (removers[removedIndex] ?? removers[removedIndex - 1]);
      (next ?? input.current)?.focus();
    }, 0);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // "net, pliers, hooks": a piece for each, once each; any refused stay in the box with the reason.
    const seen = new Set<string>();
    const parts = label.split(",").filter((part) => {
      const key = pieceKey(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const refused: { part: string; message: string }[] = [];
    // Only commas (",,,") name nothing: refused as an empty name rather than added as a piece called ",,,".
    const pieces = parts.length > 0 ? parts : [label.includes(",") ? "" : label];
    for (const part of pieces) {
      const message = add(tripId, part);
      if (message) refused.push({ part: part.trim(), message });
    }
    setLabel(refused.map((row) => row.part).join(", "));
    setError(refused[0]?.message ?? "");
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
      <button
        type="button"
        className="text-button tackle-unpack"
        onClick={() => {
          unpackTrip(tripId);
          focusAfter();
        }}
      >
        {t("Unpack all")}
      </button>
    ) : null;

  return (
    <section ref={box} className="tackle-block" aria-label={name ?? heading ?? t("Tackle")}>
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
        <p className="empty">
          {t("Nothing on this list yet.")}
          {lastBag ? (
            <>
              {" "}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  copyTrip(lastBag.id, tripId);
                  focusAfter();
                }}
              >
                {t("Copy the list from {trip}, {day}", { trip: outingName(lastBag), day: formatDay(lastBag.date) })}
              </button>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="tackle-list">
          {rows.map((item, index) => (
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
                onClick={() => {
                  remove(item.id);
                  focusAfter(index);
                }}
                aria-label={t("Take {piece} off the list", { piece: t(item.label) })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 ? (
        <CopySummary
          text={() => {
            const trip = trips.find((row) => row.id === tripId);
            return packingText(trip ? `${t("Tackle for {trip}", { trip: outingName(trip) })}, ${formatDay(trip.date)}` : (name ?? heading ?? t("Tackle")), rows);
          }}
          file="stillwater-tackle.txt"
          label={t("Copy the list")}
          copied={t("List copied.")}
          saved={t("The list was downloaded instead.")}
        />
      ) : null}
      {missing.length > 0 ? (
        <p className="form-note lure-tips tackle-suggest">
          {t("Works on this water:")}{" "}
          {missing.map((lure) => (
            <button key={lure} type="button" className="lure-tip" onClick={() => {
                const message = add(tripId, lure);
                setError(message ?? "");
                if (!message) focusAfter();
              }}>
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
            ref={input}
            onChange={(event) => {
              setLabel(event.target.value);
              setError("");
            }}
            placeholder={t("Spare leader")}
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
