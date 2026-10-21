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
import { FIELD_NEWS } from "./fieldNews";
import { NEWS_ITEMS } from "../game/whatsNew";
import { PL_GAME } from "../i18n/pl/game";

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

/** The leaders line under a kind's card on Bests: its best lure, water and time of day. */
function leaders(box: HTMLElement, kind: string): string {
  const card = [...box.querySelectorAll(".spot-card")].find((each) => each.querySelector("h3")?.textContent === kind)!;
  return card.querySelector(".kind-leaders")?.textContent ?? "";
}

const kindFish = (id: string, species: string, at: Date): CatchEntry => ({ ...fish(id, "pond", at), species });

describe("round 126 ideas: Bests", () => {
  // Roach: three at dawn this year, two at night last year. Perch: two at morning, two at night. Pike: one fish.
  const book: Logbook = {
    spots: [spot("pond", "Mill Pond")],
    trips: [],
    catches: [
      kindFish("1", "Roach", new Date(2026, 5, 1, 5)),
      kindFish("2", "Roach", new Date(2026, 5, 2, 6)),
      kindFish("3", "Roach", new Date(2026, 5, 3, 7)),
      kindFish("4", "Roach", new Date(2025, 5, 1, 22)),
      kindFish("5", "Roach", new Date(2025, 5, 2, 23)),
      kindFish("6", "Perch", new Date(2026, 6, 1, 9)),
      kindFish("7", "Perch", new Date(2026, 6, 2, 9)),
      kindFish("8", "Perch", new Date(2026, 6, 3, 22)),
      kindFish("9", "Perch", new Date(2026, 6, 4, 22)),
      kindFish("10", "Pike", new Date(2026, 6, 5, 5)),
    ],
  };

  it("names the time of day a kind came at most", async () => {
    expect(leaders(await bests(book), "Roach")).toContain("Best time of day: Dawn (3)");
  });

  it("names none on a tie or for a single fish", async () => {
    const box = await bests(book);
    expect(leaders(box, "Perch")).not.toContain("Best time of day");
    expect(leaders(box, "Pike")).not.toContain("Best time of day");
  });

  it("takes the season picked", async () => {
    expect(leaders(await bests(book, "/bests?year=2025"), "Roach")).toContain("Best time of day: Night (2)");
  });

  it("says it in Polish, the time in lower case", async () => {
    setLang("pl");
    expect(leaders(await bests(book), "Płoć")).toContain("Najczęściej o tej porze: świt (3)");
  });
});

describe("round 126: news card field83", () => {
  it("lists the line for the field log, with its Polish", () => {
    const line = NEWS_ITEMS.find((item) => item.includes("a kind's card now names the time of day it came at most"));
    expect(line).toBeDefined();
    expect(FIELD_NEWS.has(line!)).toBe(true);
    expect(PL_GAME[line!]).toBeTruthy();
  });
});
