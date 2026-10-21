// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { BestsPage } from "./bests/BestsPage";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { setLang } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const spot = (id: string, name: string): Spot => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, spotId: string): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;
const fish = (id: string, spotId: string, at: Date): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId, tripId: null, caughtAt: at.toISOString(), note: "", weather: null }) as CatchEntry;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21, 12));
});
afterEach(() => {
  setLang("en");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function bests(book: Logbook, at = "/bests"): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[at]}>
        <LogbookProvider>
          <BestsPage />
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

/** Each water card's name, and whether it carries the season's stamp. */
function waterStamps(box: HTMLElement): Record<string, boolean> {
  const cards = box.querySelector("#waters-with-fish")!.closest("section")!.querySelectorAll(".spot-card");
  return Object.fromEntries([...cards].map((card) => [card.querySelector("h3")!.textContent, card.textContent!.includes("New this season")]));
}

describe("round 122 ideas: Bests", () => {
  // Old Pond and Sniardwy gave fish in 2025; in 2026 New Lake gave its first, and Śniardwy, Sniardwy's twin, its first.
  // Night Pond's first came in the small hours of New Year's Day, on the evening's outing: a 2025 fish.
  const book: Logbook = {
    spots: [spot("old", "Old Pond"), spot("sn", "Sniardwy"), spot("sn2", "Śniardwy"), spot("new", "New Lake"), spot("night", "Night Pond")],
    trips: [trip("eve", "2025-12-31", "night")],
    catches: [
      fish("1", "old", new Date(2025, 5, 1, 10)),
      fish("2", "sn", new Date(2025, 5, 2, 10)),
      fish("3", "old", new Date(2026, 5, 1, 10)),
      fish("4", "sn2", new Date(2026, 5, 2, 10)),
      fish("5", "sn2", new Date(2026, 5, 3, 10)),
      fish("6", "new", new Date(2026, 5, 4, 10)),
      { ...fish("7", "night", new Date(2026, 0, 1, 1)), tripId: "eve" },
      fish("8", "night", new Date(2026, 5, 5, 10)),
    ],
  };

  it("stamps a water whose first fish came in the season picked, twins as one", async () => {
    expect(waterStamps(await bests(book, "/bests?year=2026"))).toEqual({ "Śniardwy": false, "Night Pond": false, "New Lake": true, "Old Pond": false });
  });

  it("stamps none in the book's first season, nor all time", async () => {
    expect(Object.values(waterStamps(await bests(book, "/bests?year=2025")))).not.toContain(true);
    expect(Object.values(waterStamps(await bests(book)))).not.toContain(true);
  });

  it("says how many of this year's days on the water gave a fish", async () => {
    const box = await bests({ ...book, trips: [...book.trips, trip("blank", "2026-03-01", "old")] });
    expect(box.textContent).toContain("Days on the water in 2026: 6, 5 with a fish");
  });

  it("leaves that out when every day gave one", async () => {
    const text = (await bests(book)).textContent!;
    expect(text).toContain("Days on the water in 2026: 5");
    expect(text).not.toContain("Days on the water in 2026: 5,");
  });

  it("leaves it out of a year with no fish yet", async () => {
    const text = (await bests({ ...book, catches: book.catches.filter((entry) => entry.caughtAt < "2025-12"), trips: [...book.trips, trip("blank", "2026-03-01", "old")] })).textContent!;
    expect(text).toContain("Days on the water in 2026: 1");
    expect(text).not.toContain("Days on the water in 2026: 1,");
  });

  it("says it in Polish", async () => {
    setLang("pl");
    const box = await bests({ ...book, trips: [...book.trips, trip("blank", "2026-03-01", "old")] });
    expect(box.textContent).toContain("Dni nad wodą w 2026: 6, z rybą: 5");
    const season = await bests(book, "/bests?year=2026");
    expect([...season.querySelectorAll(".spot-card")].find((card) => card.querySelector("h3")?.textContent === "New Lake")?.textContent).toContain("Nowość sezonu");
  });
});
