// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot } from "@stillwater/shared";
import { BestsPage } from "./bests/BestsPage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const fish = (id: string, spotId: string, year: number, day: number): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId, tripId: null, caughtAt: new Date(year, 8, day, 9).toISOString(), note: "", weather: null }) as CatchEntry;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function showBests(book: Logbook, at = "/bests?year=2026"): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  markFieldNewsSeen();
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[at]}>
        <LogbookProvider>
          <TackleProvider>
            <BestsPage />
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

const recap = (box: HTMLElement) => box.querySelector(".season-recap")?.textContent ?? "";
const waterCards = (box: HTMLElement) => [...box.querySelector("#waters-with-fish")!.closest("section")!.querySelectorAll("a.spot-card")].map((card) => card.getAttribute("href"));

describe("round 132: Bests in a picked season and waters with no name", () => {
  it("opens a no-name water's own page from its card, a named one's season search", async () => {
    const book: Logbook = { spots: [water("blank", "  "), water("own", "Own Lake")], trips: [], catches: [fish("1", "blank", 2025, 1), fish("2", "blank", 2026, 2), fish("3", "own", 2026, 3)] };
    const cards = waterCards(await showBests(book));
    expect(cards).toContain("/spots/blank");
    expect(cards.find((href) => href !== "/spots/blank")).toContain("Own+Lake");
  });

  it("calls no water best when a no-name water has as many fish that season", async () => {
    const book: Logbook = {
      spots: [water("blank", ""), water("own", "Own Lake")],
      trips: [],
      catches: [fish("1", "own", 2025, 1), fish("2", "blank", 2026, 2), fish("3", "blank", 2026, 3), fish("4", "own", 2026, 4), fish("5", "own", 2026, 5)],
    };
    expect(recap(await showBests(book))).not.toContain("Best water");
  });

  it("names a water best when it leads every no-name water", async () => {
    const book: Logbook = {
      spots: [water("blank", ""), water("own", "Own Lake")],
      trips: [],
      catches: [fish("1", "own", 2025, 1), fish("2", "blank", 2026, 2), fish("3", "own", 2026, 3), fish("4", "own", 2026, 4)],
    };
    expect(recap(await showBests(book))).toContain("Best water: Own Lake (2)");
  });

  it("names none when a no-name water leads", async () => {
    const book: Logbook = {
      spots: [water("blank", ""), water("own", "Own Lake")],
      trips: [],
      catches: [fish("1", "own", 2025, 1), fish("2", "blank", 2026, 2), fish("3", "blank", 2026, 3), fish("4", "own", 2026, 4)],
    };
    expect(recap(await showBests(book))).not.toContain("Best water");
  });
});
