// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CatchEntry, Logbook, Spot } from "@stillwater/shared";
import { SpotPage, SpotsPage } from "./SpotPages";
import { SpotMapPage } from "./map/SpotMapPage";
import { SpeciesPage } from "./SpeciesPage";
import { TripPage } from "./TripPages";
import { BestsPage } from "./bests/BestsPage";
import { seasonCopy } from "./bests/SeasonRecap";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { waterName } from "./format";
import { spotSummary } from "./summaries";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21, 12));
  markFieldNewsSeen();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const fish = (id: string, day: number, spotId: string): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId, tripId: null, caughtAt: new Date(2026, 9, day, 7).toISOString(), note: "", weather: null }) as CatchEntry;

// Waters imported from a file with no name, beside one with a name.
const book: Logbook = {
  spots: [water("a", ""), water("b", "  "), water("own", "Own Lake")],
  trips: [{ id: "t", date: "2026-10-03", spotId: "a", title: "Dawn", note: "" }],
  catches: [{ ...fish("0", 2, "own"), caughtAt: new Date(2025, 5, 1, 7).toISOString() }, fish("1", 2, "a"), fish("2", 3, "a"), fish("3", 4, "b"), fish("5", 6, "b"), fish("4", 5, "own")],
};

async function show(path: string, element?: ReactNode): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[path]}>
        <LogbookProvider>
          <TackleProvider>
            {element ?? (
              <Routes>
                <Route path="/spots" element={<SpotsPage />} />
                <Route path="/spots/:spotId" element={<SpotPage />} />
                <Route path="/map" element={<SpotMapPage />} />
                <Route path="/trips/:tripId" element={<TripPage />} />
                <Route path="/species/:species" element={<SpeciesPage />} />
              </Routes>
            )}
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

describe("round 127: a water with no name", () => {
  it("reads as one, its stray spaces gone otherwise", () => {
    expect(waterName("")).toBe("Water with no name");
    expect(waterName("  ")).toBe("Water with no name");
    expect(waterName(" Own   Lake ")).toBe("Own Lake");
  });

  it("names its card on Waters and heads its page", async () => {
    const box = await show("/spots");
    const heads = [...box.querySelectorAll(".spot-card h2")].map((head) => head.textContent);
    expect(heads.filter((head) => head === "Water with no name")).toHaveLength(2);
    expect(heads).not.toContain("");
    expect((await show("/spots/b")).querySelector("h1")?.textContent).toBe("Water with no name");
  });

  it("names its link on an outing's page and the kind's page, and opens its copied summary", async () => {
    expect([...(await show("/trips/t")).querySelectorAll('a[href="/spots/a"]')].map((link) => link.textContent)).toContain("Water with no name");
    document.body.innerHTML = "";
    const kind = [...(await show("/species/Roach")).querySelectorAll('a[href="/spots/b"]')].map((link) => link.textContent);
    expect(kind).toContain("Water with no name");
    expect(spotSummary(book.spots[1]!, 0, [], null, null)).toMatch(/^Water with no name · Lake/);
  });

  it("names its link in the Map's list of waters with no place", async () => {
    const box = await show("/map");
    const links = [...box.querySelectorAll(".map-note a")].map((link) => link.textContent);
    expect(links).toEqual(expect.arrayContaining(["Water with no name", "Water with no name", "Own Lake"]));
    expect(links).not.toContain("");
  });

  it("names its card and new-water link on Bests", async () => {
    const box = await show("/bests", <BestsPage />);
    const cards = [...box.querySelector("#waters-with-fish")!.closest("section")!.querySelectorAll("a.spot-card h3")].map((head) => head.textContent);
    expect(cards.filter((head) => head === "Water with no name")).toHaveLength(2);
    const fresh = box.querySelector(".new-waters")?.textContent ?? "";
    expect(fresh).toContain("Water with no name, Water with no name");
    expect(fresh).not.toContain("Own Lake");
  });

  it("names it in the season's new waters, and lists no blank among its waters", () => {
    const copy = seasonCopy(book, "2026", "2026-10-21");
    expect(copy).toContain("New waters: Water with no name, Water with no name");
    expect(copy).toContain("Waters: Own Lake (1)");
  });
});
