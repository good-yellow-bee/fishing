// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CatchEntry, Logbook, Spot } from "@stillwater/shared";
import { SpotPage } from "./SpotPages";
import { TripPage } from "./TripPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { findCatches } from "./CatchSearch";
import { FIND_PARAM } from "./findLinks";
import { t } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
  markFieldNewsSeen();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const fish = (id: string, at: Date, spotId: string, species: string, tripId: string | null = null): CatchEntry =>
  ({ id, species, measure: { kind: "length", inches: 10 }, lure: "Jig", spotId, tripId, caughtAt: at.toISOString(), note: "", weather: null }) as CatchEntry;

// Last year a perch and, in the small hours after New Year's Eve's outing, a pike; this year roach, zander, perch, pike.
const fishOn = (spotId: string, prefix: string) => [
  fish(`${prefix}1`, new Date(2025, 5, 3, 6), spotId, "Perch"),
  fish(`${prefix}2`, new Date(2026, 0, 1, 1), spotId, "Pike", `${prefix}eve`),
  fish(`${prefix}3`, new Date(2026, 9, 2, 6), spotId, "Roach"),
  fish(`${prefix}4`, new Date(2026, 9, 2, 7), spotId, "Zander"),
  fish(`${prefix}5`, new Date(2026, 9, 2, 8), spotId, "roach"),
  fish(`${prefix}6`, new Date(2026, 9, 3, 6), spotId, "Perch"),
  fish(`${prefix}7`, new Date(2026, 9, 3, 7), spotId, "Pike"),
];
const book: Logbook = {
  spots: [water("own", "Own Lake"), water("blank", "  "), water("young", "Young Pond")],
  trips: [
    { id: "oeve", date: "2025-12-31", spotId: "own", title: "", note: "" },
    { id: "beve", date: "2025-12-31", spotId: "blank", title: "", note: "" },
    { id: "plan", date: "2026-10-25", spotId: "blank", title: "", note: "" },
  ],
  catches: [...fishOn("own", "o"), ...fishOn("blank", "b"), fish("y1", new Date(2026, 9, 2, 6), "young", "Roach"), fish("y2", new Date(2026, 9, 3, 6), "young", "Tench")],
};

async function show(path: string): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[path]}>
        <LogbookProvider>
          <TackleProvider>
            <Routes>
              <Route path="/spots/:spotId" element={<SpotPage />} />
              <Route path="/trips/:tripId" element={<TripPage />} />
            </Routes>
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

const needle = (link: Element) => new URLSearchParams((link.getAttribute("href") ?? "").split("?")[1]).get(FIND_PARAM) ?? "";

describe("round 133: a water's page names the kinds new to it this year", () => {
  it("names this year's kinds it never gave before, each opening just this year's fish of it", async () => {
    const box = await show("/spots/own");
    const line = box.querySelector(".new-here");
    // The pike of New Year's small hours counts on its outing's day, last year: no first this year.
    expect(line?.textContent).toBe("New here this year: Roach, Zander");
    const links = [...(line?.querySelectorAll("a") ?? [])];
    expect(links.map((link) => findCatches(book, needle(link), t).map((entry) => entry.id).sort())).toEqual([["o3", "o5"], ["o4"]]);
  });

  it("says nothing for a water first fished this year, where every kind would be new", async () => {
    const box = await show("/spots/young");
    expect(box.querySelector(".new-here")).toBeNull();
  });

  it("names them as plain words on a water with no name", async () => {
    const box = await show("/spots/blank");
    expect(box.querySelector(".new-here")?.textContent).toBe("New here this year: Roach, Zander");
    expect(box.querySelector(".new-here a")).toBeNull();
  });
});

describe("round 133: an outing on a water with no name", () => {
  it("says what works there as plain words, not links to a search that finds nothing", async () => {
    const box = await show("/trips/plan");
    expect(box.querySelector(".water-tips")?.textContent).toContain("Jig");
    expect(box.querySelector(".water-tips a")).toBeNull();
  });
});
