// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { setLang } from "../i18n";
import { CatchesPage, CatchFormPage, CatchPage } from "./CatchPages";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const spot = (id: string, name: string) => ({ id, name, waterType: "lake" as const, notes: "", bestConditions: "" });
const fish = (id: string, spotId: string, caughtAt: string, species = "Zander", lure = "Jig"): CatchEntry => ({
  id,
  species,
  measure: { kind: "length", inches: 20 },
  lure,
  spotId,
  tripId: null,
  caughtAt: new Date(caughtAt).toISOString(),
  note: "",
  weather: null,
});

afterEach(() => {
  setLang("en");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const draw = async (url: string, spots: ReturnType<typeof spot>[], catches: CatchEntry[]) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00"));
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify({ spots, trips: [], catches }));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[url]}>
        <LogbookProvider>
          <Routes>
            <Route path="/catches" element={<CatchesPage />} />
            <Route path="/catches/:catchId/edit" element={<CatchFormPage />} />
            <Route path="/catches/:catchId" element={<CatchPage />} />
          </Routes>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
};

describe("round 119 fixes: catch pages", () => {
  it("says a fish is the first of its kind at a water only when its twin water had none before", async () => {
    const spots = [spot("a", "Śniardwy"), spot("b", "Sniardwy"), spot("c", "Deep Lake")];
    const catches = [fish("old", "a", "2025-06-01T08:00:00"), fish("b1", "b", "2026-06-01T08:00:00"), fish("b2", "b", "2026-07-01T08:00:00"), fish("c1", "c", "2026-06-02T08:00:00"), fish("c2", "c", "2026-07-02T08:00:00")];
    expect((await draw("/catches/b1", spots, catches)).textContent).not.toContain("First Zander here.");
    document.body.innerHTML = "";
    expect((await draw("/catches/c1", spots, catches)).textContent).toContain("First Zander here.");
  });

  it("takes the form's best and picks at a water from its twin water too", async () => {
    const spots = [spot("a", "Śniardwy"), spot("b", "Sniardwy"), spot("c", "Deep Lake")];
    const catches = [fish("a1", "a", "2026-06-01T08:00:00"), { ...fish("b1", "b", "2026-06-02T08:00:00", "Zander", "Spoon"), measure: { kind: "length" as const, inches: 30 } }, { ...fish("c1", "c", "2026-06-03T08:00:00"), measure: { kind: "length" as const, inches: 35 } }];
    const box = await draw("/catches/a1/edit", spots, catches);
    expect(box.textContent).toContain("At this water: 30 in");
    expect([...box.querySelectorAll("button.lure-tip")].map((chip) => chip.textContent)).toContain("Spoon");
  });

  it("names twin waters in a search's summary as the busier twin writes it", async () => {
    const spots = [spot("a", "Home Lake"), spot("b", "Deep Lake"), spot("c", "home  lake")];
    const catches = [fish("1", "a", "2026-06-01T08:00:00"), fish("2", "a", "2026-06-02T08:00:00"), fish("3", "a", "2026-06-03T08:00:00"), fish("4", "c", "2026-06-04T08:00:00"), fish("5", "b", "2026-06-05T08:00:00")];
    const text = (await draw("/catches?find=zander", spots, catches)).textContent;
    expect(text).toContain("Most from Home Lake (4).");
    expect(text).toContain("By water: Home Lake 4 · Deep Lake 1");
  });

  it("offers a water's kinds and lures on the Polish form once each, named as the catch cards name them", async () => {
    setLang("pl");
    const spots = [spot("a", "Home Lake")];
    const catches = [fish("1", "a", "2026-06-01T08:00:00", "zander", "jigs"), fish("2", "a", "2026-06-02T08:00:00", "Northern pike", "Spoon"), fish("3", "a", "2026-06-03T08:00:00", "Szczupak", "Spoon")];
    const box = await draw("/catches/1/edit", spots, catches);
    const chips = [...box.querySelectorAll("button.lure-tip")].map((chip) => chip.textContent);
    expect(chips.filter((name) => name === "Szczupak")).toHaveLength(1);
    expect(chips).toContain("Sandacz");
    expect(chips).not.toContain("zander");
    expect(box.querySelector("h1")?.getAttribute("data-title")).toBe("Edycja: Sandacz");
  });
});
