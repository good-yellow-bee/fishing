// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { SeasonRecapBox } from "./bests/SeasonRecap";

const fish = (id: string, caughtAt: Date) =>
  ({ id, species: "Zander", lure: "Jig", spotId: "home", tripId: null, caughtAt: caughtAt.toISOString(), measure: { kind: "length", inches: 20 }, note: "" }) as unknown as CatchEntry;

describe("round 80 ideas: the season recap's best day opens its fish", () => {
  const book = { spots: [{ id: "home", name: "Home", waterType: "lake", notes: "" }], trips: [], catches: [fish("a", new Date(2025, 5, 1, 8)), fish("b", new Date(2025, 5, 1, 9)), fish("c", new Date(2025, 6, 1, 9))] } as unknown as Logbook;

  it("links the line when a link is given, and leaves it plain otherwise", () => {
    const linked = renderToStaticMarkup(
      <MemoryRouter>
        <SeasonRecapBox book={book} year="2025" today="2026-10-18" dayLink={(date) => `/?find=${date}`} />
      </MemoryRouter>,
    );
    expect(linked).toMatch(/<a href="\/\?find=2025-06-01"[^>]*>Best day: [^<]+ · 2 fish<\/a>/);
    const plain = renderToStaticMarkup(
      <MemoryRouter>
        <SeasonRecapBox book={book} year="2025" today="2026-10-18" />
      </MemoryRouter>,
    );
    expect(plain).not.toContain("<a ");
  });
});

describe("round 80 ideas: the search's splits wrap", () => {
  it("breaks a long kind's name", () => {
    expect(readFileSync(`${import.meta.dirname}/search.css`, "utf8")).toMatch(/\.match-split \{[^}]*overflow-wrap: anywhere;/);
  });
});
