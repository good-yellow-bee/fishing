// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { looseFishFor } from "./looseFish";
import { FishSum } from "./FishSum";
import { tripSummary } from "./summaries";
import { sameName } from "./tripDates";

const fish = (id: string, species: string, inches: number): CatchEntry => ({ id, species, measure: { kind: "length", inches }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });

describe("round 106: an outing's fish line", () => {
  it("counts a kind once however it was typed, named as most of its fish are", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FishSum catches={[fish("a", "Perch", 9), fish("b", "perch ", 8), fish("c", "Perches", 10)]} />
      </MemoryRouter>,
    );
    expect(html).toContain("1 species");
    expect(html).toContain("Largest: Perch, 10 in");
  });
});

describe("round 106: an untitled outing on a water with stray spaces", () => {
  it("names the water once", () => {
    expect(sameName("  Pine   Pond ", "Pine Pond")).toBe(true);
    const trip = { id: "t", date: "2026-08-20", spotId: "own", title: "Pine Pond", note: "" };
    expect(tripSummary(trip, "  Pine   Pond ", []).split("\n")[0]).toMatch(/^[^·]+ · Pine Pond$/);
  });
});

describe("round 106: a loose fish offered to the right outing", () => {
  const at = (day: string, hh: string) => new Date(`${day}T${hh}`).toISOString();
  const outing = (id: string, date: string) => ({ id, date, spotId: "own", title: "", note: "" });
  const loose = (id: string, caughtAt: string): CatchEntry => ({ ...fish(id, "Perch", 9), tripId: null, caughtAt });
  const on = (id: string, tripId: string, caughtAt: string): CatchEntry => ({ ...fish(id, "Perch", 9), tripId, caughtAt });
  const ids = (book: Logbook, trip: { id: string; date: string; spotId: string; title: string; note: string }) => looseFishFor(book, trip).map((entry) => entry.id);

  it("goes to the nearer of a dawn and a dusk", () => {
    const book: Logbook = { spots: [], trips: [outing("dawn", "2026-08-20"), outing("dusk", "2026-08-20")], catches: [on("d", "dawn", at("2026-08-20", "06:00")), on("k", "dusk", at("2026-08-20", "20:20")), loose("x", at("2026-08-20", "20:35"))] };
    expect(ids(book, book.trips[0]!)).toEqual([]);
    expect(ids(book, book.trips[1]!)).toEqual(["x"]);
  });

  it("is offered by both while neither has a fish to go by", () => {
    const book: Logbook = { spots: [], trips: [outing("dawn", "2026-08-20"), outing("dusk", "2026-08-20")], catches: [loose("x", at("2026-08-20", "20:35"))] };
    expect(ids(book, book.trips[0]!)).toEqual(["x"]);
    expect(ids(book, book.trips[1]!)).toEqual(["x"]);
  });

  it("goes to last evening's outing in the small hours, though the next day is planned too", () => {
    const book: Logbook = { spots: [], trips: [outing("eve", "2026-08-20"), outing("next", "2026-08-21")], catches: [on("e", "eve", at("2026-08-20", "23:00")), loose("x", at("2026-08-21", "01:00"))] };
    expect(ids(book, book.trips[0]!)).toEqual(["x"]);
    expect(ids(book, book.trips[1]!)).toEqual([]);
  });
});
