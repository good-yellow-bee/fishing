import { useState } from "react";
import { searchCatches, spotById, tripById } from "@stillwater/shared";
import { CatchCard } from "./cards";
import { useLogbook } from "./LogbookState";
import "./search.css";

export function CatchSearch() {
  const { book } = useLogbook();
  const [query, setQuery] = useState("");
  const needle = query.trim();
  const matches = needle ? searchCatches(book, needle) : [];

  return (
    <section className="catch-search" aria-label="Find a catch">
      <label htmlFor="catch-search">Find a catch</label>
      <input
        id="catch-search"
        type="search"
        value={query}
        placeholder="Species, water, or lure"
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
      />
      {needle ? (
        <div role="status">
          {matches.length === 0 ? (
            <p className="empty">Nothing in the book matches that.</p>
          ) : (
            <div className="stack">
              {matches.map((entry) => (
                <CatchCard
                  key={entry.id}
                  entry={entry}
                  spotName={spotById(book, entry.spotId)?.name ?? "Unknown water"}
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
