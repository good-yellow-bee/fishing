// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { HomePage } from "./HomePage";
import { BestsPage } from "./bests/BestsPage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, spotId = "own", title = ""): Trip => ({ id, date, spotId, title, note: "" }) as Trip;
const fish = (id: string, tripId: string | null, day: number, hour: number, spotId = "own"): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId, tripId, caughtAt: new Date(2026, 9, day, hour).toISOString(), note: "", weather: null }) as CatchEntry;

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

async function show(book: Logbook, page: ReactNode): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  markFieldNewsSeen();
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter>
        <LogbookProvider>
          <TackleProvider>{page}</TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

describe("round 126: Bests keeps waters with no name apart", () => {
  it("gives each its own card and counts each in the waters tile", async () => {
    const book: Logbook = {
      spots: [water("a", ""), water("b", " "), water("own", "Own Lake")],
      trips: [],
      catches: [fish("1", null, 2, 7, "a"), fish("2", null, 3, 7, "b"), fish("3", null, 4, 7, "own")],
    };
    const box = await show(book, <BestsPage />);
    const cards = [...box.querySelector("#waters-with-fish")!.closest("section")!.querySelectorAll("a.spot-card")];
    expect(cards.map((card) => card.getAttribute("href"))).toEqual(expect.arrayContaining(["/spots/a", "/spots/b", "/spots/own"]));
    expect(cards).toHaveLength(3);
    expect(box.querySelector(".stat-row > div:nth-child(3)")?.textContent).toContain("3 of 3");
  });
});

describe("round 126: Home's Next for last evening's outing in the small hours", () => {
  const nextBox = (box: HTMLElement) => box.querySelector(".stat-row > div:last-child")?.textContent ?? "";

  it("says Out now with its fish so far, a loose small-hours one among them", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 3));
    const book: Logbook = { spots: [water("own", "Own Lake")], trips: [trip("night", "2026-10-20", "own", "Night session")], catches: [fish("1", "night", 20, 22), fish("2", null, 21, 1)] };
    const box = await show(book, <HomePage />);
    const next = nextBox(box);
    expect(next).toContain("Out now");
    expect(next).toContain("So far: 2 fish · the last at 1:00");
    expect(next).not.toContain("Copy the plan");
  });

  it("says Out now with no plan to copy before its first fish, as the Map does", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 3));
    const box = await show({ spots: [water("own", "Own Lake")], trips: [trip("night", "2026-10-20", "own", "Night session")], catches: [] }, <HomePage />);
    const next = nextBox(box);
    expect(next).toContain("Out now");
    expect(next).not.toContain("So far");
    expect(next).not.toContain("Copy the plan");
  });
});
