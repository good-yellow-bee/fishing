// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CatchEntry, Logbook, Spot } from "@stillwater/shared";
import { SpotPage, SpotsPage } from "./SpotPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";

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

// The same fish on a water with no name and on a named one, enough for every count on a water's page to show.
const fishOn = (spotId: string, prefix: string) => [
  fish(`${prefix}1`, new Date(2026, 9, 2, 6), spotId, "Roach", `${prefix}t`),
  fish(`${prefix}2`, new Date(2026, 9, 2, 7), spotId, "Zander", `${prefix}t`),
  fish(`${prefix}3`, new Date(2026, 9, 2, 8), spotId, "Roach", `${prefix}t`),
  fish(`${prefix}4`, new Date(2025, 5, 3, 6), spotId, "Perch"),
  fish(`${prefix}5`, new Date(2025, 5, 4, 6), spotId, "Perch"),
];
const book: Logbook = {
  spots: [water("blank", "  "), water("own", "Own Lake"), ...["Bass Hole", "Cedar Bend", "Deep Pit", "Elm Pond", "Fox Lake", "Gull Bay", "Heron Pool"].map((name, index) => water(`w${index}`, name))],
  trips: [
    { id: "bt", date: "2026-10-02", spotId: "blank", title: "", note: "" },
    { id: "ot", date: "2026-10-02", spotId: "own", title: "", note: "" },
  ],
  catches: [...fishOn("blank", "b"), ...fishOn("own", "o")],
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
              <Route path="/spots" element={<SpotsPage />} />
              <Route path="/spots/:spotId" element={<SpotPage />} />
            </Routes>
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

const searches = (box: HTMLElement) => [...box.querySelectorAll("a")].map((link) => decodeURIComponent((link.getAttribute("href") ?? "").replace(/\+/g, " "))).filter((href) => href.includes("find="));

describe("round 133: a water with no name's page", () => {
  it("says its counts as plain words: no search opens just its fish", async () => {
    const box = await show("/spots/blank");
    expect(searches(box).filter((href) => href.includes('water:""'))).toEqual([]);
    expect(box.querySelector(".species-chips")?.textContent).toContain("Roach (2)");
    expect(box.querySelector(".species-chips a")).toBeNull();
    expect(box.querySelector(".not-yet")?.textContent).toContain("Perch");
    expect(box.querySelector(".not-yet a")).toBeNull();
    expect(box.querySelector(".most-kinds")?.textContent).toContain("Most kinds in one day: 2");
    expect(box.querySelector(".most-kinds a")).toBeNull();
    expect(box.querySelector(".water-tips")?.textContent).toContain("Jig");
    expect(box.querySelector(".water-tips a")).toBeNull();
    expect(box.textContent).toContain("Through the year");
    expect(box.textContent).toContain("By year");
    // Its own fish and outings still open by id.
    expect(box.querySelector('a[href="/trips/bt"]')).not.toBeNull();
    expect(box.querySelector('a[href^="/catches/b1"]')).not.toBeNull();
  });

  it("keeps a named water's links", async () => {
    const box = await show("/spots/own");
    const found = searches(box);
    expect(found.some((href) => href.includes('water:"Own Lake"') && href.includes('species:"Roach"'))).toBe(true);
    expect(found.some((href) => href.includes('water:"Own Lake"') && href.includes('month:"'))).toBe(true);
    expect(found.some((href) => href.includes('water:"Own Lake"') && href.includes("2025"))).toBe(true);
    expect(box.querySelector(".most-kinds a")).not.toBeNull();
    expect(box.querySelector(".water-tips a")).not.toBeNull();
  });
});

describe("round 133: finding a water on Waters", () => {
  it("finds a water with no name by the name its card shows", async () => {
    const box = await show("/spots?q=no%20name");
    expect([...box.querySelectorAll(".spot-card h2")].map((head) => head.textContent)).toEqual(["Water with no name"]);
  });
});
