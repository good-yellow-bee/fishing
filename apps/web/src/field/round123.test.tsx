// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { sampleLogbook, type Logbook, type Spot } from "@stillwater/shared";
import { SpotPage, SpotsPage } from "./SpotPages";
import { SpotMapPage } from "./map/SpotMapPage";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { seasonWaters } from "./seasonWaters";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21, 12));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function page(book: Logbook, path: string): Promise<string> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[path]}>
        <LogbookProvider>
          <Routes>
            <Route path="/spots" element={<SpotsPage />} />
            <Route path="/spots/:spotId" element={<SpotPage />} />
            <Route path="/map" element={<SpotMapPage />} />
          </Routes>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box.textContent ?? "";
}

const spot = (id: string, name: string): Spot => ({ id, name, waterType: "lake", notes: "", bestConditions: "" });

describe("round 123: Waters beside the sample week with only a water of the angler's own", () => {
  // Made a week ago: its dawn plan on Cedar Bend has passed blank.
  const sample = sampleLogbook(new Date(2026, 9, 14, 12));
  const book: Logbook = { ...sample, spots: [...sample.spots, spot("own", "Own Lake")] };

  it("leaves the blank plan out of the water's card, as Trips leaves it out", async () => {
    const card = [...(await page(book, "/spots"), document.querySelectorAll(".spot-card"))].find((each) => each.textContent?.includes("Cedar Bend"));
    expect(card?.textContent).toContain("2 fish · 1 outing");
  });

  it("leaves it out of the water's page: no blank outing, no plan's note", async () => {
    const text = await page(book, "/spots/spot-cedar");
    expect(text).not.toContain("without a fish");
    expect(text).not.toContain("Dawn patrol");
    expect(text).not.toContain("Weed edge before the wind fills in.");
    expect(text).toContain("Last fished here 10 days ago · Sun, Oct 11 · 2 fish");
  });

  it("still counts it in what deleting the water takes", async () => {
    await page(book, "/spots/spot-cedar");
    const remove = [...document.querySelectorAll("button")].find((button) => button.textContent === "Delete")!;
    await act(async () => remove.click());
    expect(document.querySelector(".confirm-ask")?.textContent).toContain("Its 2 outings and 2 fish leave the book too.");
  });

  it("leaves it out of the Map's rest", async () => {
    const text = await page(book, "/map");
    expect(text).toContain("Cedar BendLake2 fish, last Sun, Oct 11 · rested 10 days");
  });

  it("still counts it while the sample week is all the book holds", async () => {
    const text = await page(sample, "/spots/spot-cedar");
    expect(text).toContain("Dawn patrol");
  });
});

describe("round 123: twin waters and waters with no name", () => {
  const fish = (id: string, spotId: string) => ({ id, species: "Perch", measure: { kind: "length" as const, inches: 9 }, lure: "Spinner", spotId, tripId: null, caughtAt: new Date(2026, 8, 1, 9).toISOString(), note: "", weather: null });
  const base: Logbook = { spots: [], trips: [], catches: [] } as unknown as Logbook;

  it("names every twin and says the links open all their fish", async () => {
    const book = { ...base, spots: [spot("a", "Śniardwy"), spot("b", "Sniardwy"), spot("c", "ŚNIARDWY")], catches: [fish("f1", "a")] };
    const text = await page(book, "/spots/a");
    expect(text).toContain("Other waters have the same or nearly the same name (Sniardwy, ŚNIARDWY), so the links on this page open the fish of all of them.");
  });

  it("names a spelling shared by two twins once", async () => {
    const book = { ...base, spots: [spot("a", "Śniardwy"), spot("b", "Sniardwy"), spot("c", "Sniardwy")], catches: [fish("f1", "a")] };
    expect(await page(book, "/spots/a")).toContain("nearly the same name (Sniardwy), so");
  });

  it("says one name when every twin is spelled alike", async () => {
    const book = { ...base, spots: [spot("a", "Home Lake"), spot("b", "Home Lake"), spot("c", " Home  Lake")], catches: [fish("f1", "a")] };
    expect(await page(book, "/spots/a")).toContain("Other waters are also called Home Lake, so the links on this page open the fish of all of them.");
  });

  it("keeps the two-water note for one twin", async () => {
    const book = { ...base, spots: [spot("a", "Śniardwy"), spot("b", "Sniardwy")], catches: [fish("f1", "a")] };
    expect(await page(book, "/spots/a")).toContain("Another water has nearly the same name, Sniardwy, so the links on this page open the fish of both.");
  });

  it("never makes two waters with no name twins", async () => {
    const book = { ...base, spots: [spot("a", ""), spot("b", "")], catches: [fish("f1", "a"), fish("f2", "b")] };
    expect(await page(book, "/spots/a")).not.toContain("Another water");
    expect(seasonWaters(book, "2026-10-21")).toEqual({ fished: 2, first: 2 });
  });
});
