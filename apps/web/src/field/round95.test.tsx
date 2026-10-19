// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { PagedCatches } from "./PagedCatches";
import { speciesCounts } from "./speciesLink";

const fish = (id: string, over: Partial<CatchEntry> = {}): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own",
  tripId: null,
  caughtAt: "2026-10-10T08:00",
  note: "",
  weather: null,
  ...over,
});

afterEach(() => setLang("en"));

describe("round 95: released and kept read in either language", () => {
  const book: Logbook = { spots: [], trips: [], catches: [fish("a", { released: true }), fish("b", { released: true }), fish("c")] };

  it("in any of their forms", () => {
    setLang("pl");
    for (const typed of ["released", "wypuszczony", "wypuszczonych", "Wypuszczona"]) expect(findCatches(book, typed, t).map((entry) => entry.id).sort(), typed).toEqual(["a", "b"]);
    for (const typed of ["kept", "zabrana", "zabranych"]) expect(findCatches(book, typed, t).map((entry) => entry.id), typed).toEqual(["c"]);
  });
});

describe("round 95: one kind however it was written", () => {
  it("is named once, trimmed", () => {
    expect(speciesCounts([fish("a", { species: "Zander " }), fish("b", { species: "zander" })])).toEqual([{ species: "Zander", count: 2 }]);
  });
});

describe("round 95: a month of only the game's fish says so", () => {
  it("rather than naming the sample week", () => {
    setLang("pl");
    const html = renderToStaticMarkup(
      <PagedCatches items={[fish("g", { spotId: "spot-stillwater" })]} monthOf={() => "2026-10"} headLevel={2} counted={() => false}>
        {(item) => <p key={item.id}>{item.id}</p>}
      </PagedCatches>,
    );
    expect(html).toContain("Październik 2026 · 1 z gry");
  });
});
