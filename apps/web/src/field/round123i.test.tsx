// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { SpotPage } from "./SpotPages";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { PLAY_LAKE_ID } from "./playLake";
import { NEWS_ITEMS } from "../game/whatsNew";
import { FIELD_NEWS } from "./fieldNews";
import { PL_GAME } from "../i18n/pl/game";

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

async function page(book: Logbook, path: string): Promise<void> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[path]}>
        <LogbookProvider>
          <Routes>
            <Route path="/spots/:spotId" element={<SpotPage />} />
          </Routes>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
}

const spot = (id: string, name: string): Spot => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, spotId: string): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;
const fish = (id: string, spotId: string, species: string, at: Date, tripId: string | null = null): CatchEntry =>
  ({ id, species, measure: { kind: "length", inches: 12 }, lure: "Jig", spotId, tripId, caughtAt: at.toISOString(), note: "", weather: null }) as CatchEntry;
const onlyHere = () => document.querySelector(".only-here")?.textContent ?? null;

describe("round 123 ideas: the kinds only this water has given", () => {
  const spots = [spot("mill", "Mill Pond"), spot("cedar", "Cedar Lake")];
  const catches = [
    fish("a", "mill", "Tench", new Date(2026, 5, 1, 7)),
    fish("b", "mill", "tench", new Date(2026, 5, 2, 7)),
    fish("c", "mill", "Perch", new Date(2026, 5, 3, 7)),
    fish("d", "mill", "Zander", new Date(2026, 5, 4, 7)),
    fish("e", "cedar", "Perches", new Date(2026, 5, 5, 7)),
  ];

  it("names them in readers' order, the kind named two ways once, each opening this water's fish of it", async () => {
    await page({ spots, trips: [], catches }, "/spots/mill");
    expect(onlyHere()).toBe("Only from this water: Tench, Zander");
    const links = [...document.querySelectorAll(".only-here a")].map((link) => new URLSearchParams((link.getAttribute("href") ?? "").split("?")[1]).get("find") ?? "");
    expect(links[0]).toContain('water:"Mill Pond"');
    expect(links[0]).toContain('species:"Tench"');
  });

  it("says nothing while no other water has a fish, or every kind would be its alone", async () => {
    await page({ spots, trips: [], catches: catches.filter((entry) => entry.spotId === "mill") }, "/spots/mill");
    expect(onlyHere()).toBeNull();
  });

  it("takes a twin's fish as this water's, as its links do, and leaves the game's lake out", async () => {
    const twins = [...spots, spot("mill2", "Mill  pond"), spot(PLAY_LAKE_ID, "Stillwater Lake")];
    await page({ spots: twins, trips: [], catches: [...catches, fish("f", "mill2", "Zander", new Date(2026, 5, 6, 7)), fish("g", PLAY_LAKE_ID, "Tench", new Date(2026, 5, 7, 7))] }, "/spots/mill");
    expect(onlyHere()).toBe("Only from this water: Tench, Zander");
  });

  it("is never said on the game's lake", async () => {
    await page({ spots: [...spots, spot(PLAY_LAKE_ID, "Stillwater Lake")], trips: [], catches: [...catches, fish("g", PLAY_LAKE_ID, "Bass", new Date(2026, 5, 7, 7))] }, `/spots/${PLAY_LAKE_ID}`);
    expect(onlyHere()).toBeNull();
  });
});

describe("round 123 ideas: last evening's outing still going in the small hours", () => {
  it("reads as fished here today beside Out now, not yesterday", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 3));
    const book: Logbook = {
      spots: [spot("mill", "Mill Pond")],
      trips: [trip("night", "2026-10-20", "mill")],
      catches: [fish("a", "mill", "Tench", new Date(2026, 9, 20, 22), "night"), fish("b", "mill", "Tench", new Date(2026, 9, 21, 1), "night")],
    };
    await page(book, "/spots/mill");
    expect(document.querySelector(".out-now")?.textContent).toContain("Out now");
    expect(document.querySelector(".last-here")?.textContent).toBe("Fished here today · 2 fish · Jig ×2");
  });
});

describe("round 123 ideas: news card field80", () => {
  it("lists the line for the field log, with its Polish", () => {
    const line = NEWS_ITEMS.find((item) => item.includes("Only from this water"));
    expect(line).toBeDefined();
    expect(FIELD_NEWS.has(line!)).toBe(true);
    expect(PL_GAME[line!]).toBeTruthy();
  });
});
