import { useState } from "react";
import { catchesNewestFirst, searchCatches, spotById, tripById, type CatchEntry, type Logbook } from "@stillwater/shared";
import { getLang, useT } from "../i18n";
import { CatchCard } from "./cards";
import { useLogbook } from "./LogbookState";
import "./search.css";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The shared search, plus species and lure names as they read in the player's language. */
function findCatches(book: Logbook, needle: string, t: (text: string) => string): CatchEntry[] {
  const found = searchCatches(book, needle);
  if (getLang() === "en") return found;
  const want = normalize(needle);
  const hit = new Set(found.map((entry) => entry.id));
  for (const entry of book.catches) {
    if (hit.has(entry.id)) continue;
    if (normalize(t(entry.species)).includes(want) || normalize(t(entry.lure)).includes(want)) hit.add(entry.id);
  }
  return catchesNewestFirst(book).filter((entry) => hit.has(entry.id));
}

export function CatchSearch() {
  const { book } = useLogbook();
  const t = useT();
  const [query, setQuery] = useState("");
  const needle = query.trim();
  const matches = needle ? findCatches(book, needle, t) : [];

  return (
    <section className="catch-search" aria-label={t("Find a catch")}>
      <label htmlFor="catch-search">{t("Find a catch")}</label>
      <input
        id="catch-search"
        type="search"
        value={query}
        placeholder={t("Species, water, or lure")}
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
      />
      {needle ? (
        <div role="status">
          {matches.length === 0 ? (
            <p className="empty">{t("Nothing in the book matches that.")}</p>
          ) : (
            <div className="stack">
              {matches.map((entry) => (
                <CatchCard
                  key={entry.id}
                  entry={entry}
                  spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                  tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
