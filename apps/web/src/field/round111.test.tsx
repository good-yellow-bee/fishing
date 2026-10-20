// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { SpeciesChips } from "./SpeciesChips";
import { PLAY_LAKE_ID, withoutPlayLake } from "./playLake";
import { seasonWaters } from "./seasonWaters";
import { lastOutByWater } from "./spotOrder";

const fish = (id: string, spotId: string, tripId: string | null = null): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId, tripId, caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });
const spot = (id: string, name: string) => ({ id, name, waterType: "lake" as const, notes: "", bestConditions: "" });

describe("round 111: a water's kind chips", () => {
  it("open the search the page counts by", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SpeciesChips catches={[fish("a", "w")]} within={'water:"Cedar Lake" -sample'} />
      </MemoryRouter>,
    );
    expect(decodeURIComponent(html).replaceAll("+", " ")).toContain('water:"Cedar Lake" -sample');
  });
});

describe("round 111: the game's lake left out of a search", () => {
  it("is kept in when a real water reads the same", () => {
    const book: Logbook = { spots: [spot(PLAY_LAKE_ID, "Stillwater"), spot("own", " Stillwáter ")], trips: [], catches: [] };
    expect(withoutPlayLake(book, "perch", [{ spotId: PLAY_LAKE_ID }])).toBe("perch");
  });
});

describe("round 111: this season's waters in the small hours", () => {
  afterEach(() => vi.useRealTimers());

  it("leave last evening's blank outing out while it may still be going", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 1, 0));
    const book: Logbook = { spots: [spot("a", "Pine Pond")], trips: [{ id: "eve", date: "2026-10-19", spotId: "a", title: "", note: "" }], catches: [] };
    expect(seasonWaters(book, "2026-10-20").fished).toBe(0);
    vi.setSystemTime(new Date(2026, 9, 20, 5, 0));
    expect(seasonWaters(book, "2026-10-20").fished).toBe(1);
  });
});

describe("round 111: a water's last day out in the small hours", () => {
  afterEach(() => vi.useRealTimers());

  it("takes a fish logged loose after midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 1, 0));
    const loose = { ...fish("n", "a"), caughtAt: new Date(2026, 9, 20, 0, 30).toISOString() };
    const book: Logbook = { spots: [spot("a", "Pine Pond")], trips: [], catches: [loose] };
    expect(lastOutByWater(book, "2026-10-19").get("a")).toBe("2026-10-20");
  });
});
