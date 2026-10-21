// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { HomePage } from "./HomePage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { FIELD_NEWS, markFieldNewsSeen } from "./fieldNews";
import { NEWS_ITEMS } from "../game/whatsNew";
import { PL_GAME } from "../i18n/pl/game";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TODAY = "2026-10-21";
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

const nextBox = (box: HTMLElement) => box.querySelector(".stat-row > div:last-child")?.textContent ?? "";

describe("round 125 ideas: Home's Next while out", () => {
  it("says how many fish today's outing has so far and when the last one came", async () => {
    const book: Logbook = { spots: [water("own", "Own Lake")], trips: [trip("eve", TODAY, "own", "Evening")], catches: [fish("1", "eve", 21, 9), fish("2", "eve", 21, 11), fish("3", "eve", 21, 10)] };
    const box = await show(book, <HomePage />);
    const next = nextBox(box);
    expect(next).toContain("Out now");
    expect(next).toContain("So far: 3 fish · the last at 11:00");
  });

  it("gives no count for a dawn and a dusk sharing a loose fish, which the cards leave to neither", async () => {
    const box = await show({ spots: [water("own", "Own Lake")], trips: [trip("dawn", TODAY, "own", "Dawn"), trip("dusk", TODAY, "own", "Dusk")], catches: [fish("1", null, 21, 10)] }, <HomePage />);
    const next = nextBox(box);
    expect(next).toContain("Out now");
    expect(next).not.toContain("So far");
  });

  it("says nothing so far once the last fish is more than twelve hours back", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 22));
    const box = await show({ spots: [water("own", "Own Lake")], trips: [trip("day", TODAY, "own", "Day")], catches: [fish("1", "day", 21, 6)] }, <HomePage />);
    expect(nextBox(box)).not.toContain("So far");
  });
});

describe("round 125: news card field82", () => {
  it("lists the line for the field log, with its Polish", () => {
    const line = NEWS_ITEMS.find((item) => item.includes("Home's Next now says how many fish it has so far"));
    expect(line).toBeDefined();
    expect(FIELD_NEWS.has(line!)).toBe(true);
    expect(PL_GAME[line!]).toBeTruthy();
  });
});
