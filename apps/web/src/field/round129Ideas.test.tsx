// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { reloadLang, setLang, t } from "../i18n";
import { CatchesPage, CatchPage } from "./CatchPages";
import { SpotPage } from "./SpotPages";
import { MergeWater } from "./MergeWater";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { MERGED_WATERS_KEY } from "./waterMerge";
import { markFieldNewsSeen } from "./fieldNews";
import { FIND_PARAM } from "./findLinks";
import { findCatches } from "./CatchSearch";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const spot = (id: string, name: string) => ({ id, name, waterType: "lake" as const, notes: "", bestConditions: "" });
const fish = (id: string, day: number, hour: number, species = "Northern pike", lure = "Spoon", spotId = "own"): CatchEntry => ({
  id,
  species,
  measure: { kind: "length", inches: 20 + day / 10 },
  lure,
  spotId,
  tripId: null,
  caughtAt: new Date(2026, 9, day, hour).toISOString(),
  note: "",
  weather: null,
});

// Three pike at dawn, one in the evening, and a perch at dawn on another water.
const book: Logbook = {
  spots: [spot("own", "Own Lake"), spot("blank", " "), spot("east", "East Pond")],
  trips: [],
  catches: [fish("1", 2, 5), fish("2", 3, 6), fish("3", 4, 6, "Northern pike", "Jig"), fish("4", 5, 19, "Northern pike", "Jig"), fish("5", 6, 6, "Perch", "Jig", "east")],
};

afterEach(() => {
  setLang("en");
  reloadLang();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const draw = async (url: string, stored = new Map<string, string>()) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  markFieldNewsSeen();
  if (!stored.has(LOGBOOK_STORAGE_KEY)) stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[url]}>
        <LogbookProvider>
          <Routes>
            <Route path="/catches" element={<CatchesPage />} />
            <Route path="/catches/:catchId" element={<CatchPage />} />
            <Route path="/spots/:spotId" element={<SpotPage />} />
            <Route path="/merge/:spotId" element={<MergeWater spotId="east" />} />
          </Routes>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
};

describe("round 129 ideas: catch pages", () => {
  it("counts a fish's kind at its part of the day, as the link's search finds them", async () => {
    const box = await draw("/catches/2");
    const link = box.querySelector<HTMLAnchorElement>(".kind-time a")!;
    expect(link.textContent).toBe("Northern pike at this time of day (Dawn): 3");
    const search = new URLSearchParams(link.getAttribute("href")!.split("?")[1]).get(FIND_PARAM)!;
    expect(findCatches(book, search, t).map((entry) => entry.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("says nothing for the only one of its kind at that part of the day", async () => {
    expect((await draw("/catches/4")).querySelector(".kind-time")).toBeNull();
    expect((await draw("/catches/5")).querySelector(".kind-time")).toBeNull();
  });

  it("carries what the found fish have in common into a search's copied summary", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const box = await draw("/catches?find=pike");
    expect(box.querySelector(".top-lure")?.textContent).toBe("Best time of day: Dawn (3).");
    const copy = [...box.querySelectorAll("button")].find((button) => button.textContent === "Copy a summary")!;
    await act(async () => copy.click());
    const lines = (writeText.mock.calls[0] as unknown as [string])[0].split("\n");
    expect(lines[1]).toBe("4 fish");
    expect(lines[2]).toBe("Best time of day: Dawn (3).");
    expect(lines[3]).toMatch(/^- /);
  });

  it("says a water with no name once in Polish", async () => {
    setLang("pl");
    const blank = { ...book, catches: book.catches.map((entry) => ({ ...entry, spotId: entry.id === "4" || entry.id === "5" ? "east" : "blank" })) };
    const stored = new Map([[LOGBOOK_STORAGE_KEY, JSON.stringify(blank)]]);
    const text = (await draw("/catches?find=szczupak", stored)).querySelector(".top-lure")?.textContent;
    expect(text).toContain("Najwięcej z łowiska bez nazwy (3).");
    expect(text).not.toContain("Łowisko bez nazwy");
  });

  it("names a water with no name kept in a merge, and one merged into it, in words of their own", async () => {
    const merged = new Map([[LOGBOOK_STORAGE_KEY, JSON.stringify(book)], [MERGED_WATERS_KEY, JSON.stringify({ gone: "blank" })]]);
    expect((await draw("/spots/gone", merged)).querySelector(".lede")?.textContent).toBe("This water was merged into a water with no name.");
    // jsdom has no scrolling; the merge box scrolls itself into view when a link opens it.
    HTMLElement.prototype.scrollIntoView = () => undefined;
    const hint = (await draw("/merge/east?merge=blank")).querySelector(".field-hint")?.textContent;
    expect(hint).toContain("The water with no name then holds 1 fish and 0 outings.");
    setLang("pl");
    expect(t("This water was merged into a water with no name.")).toBe("To łowisko połączono z łowiskiem bez nazwy.");
    expect(t("From a water with no name:")).toBe("Z łowiska bez nazwy:");
  });
});
