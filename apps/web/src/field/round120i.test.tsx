// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { HomePage } from "./HomePage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { setLang } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TODAY = "2026-10-21";
const water: Spot = { id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Spot;
const trip = (id: string, date: string): Trip => ({ id, date, spotId: "own", title: "", note: "" }) as Trip;
const fish = (id: string, tripId: string | null, day: number, hour = 10, month = 9): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId: "own", tripId, caughtAt: new Date(2026, month, day, hour).toISOString(), note: "", weather: null }) as CatchEntry;

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

async function home(book: Logbook): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  // The news card would say these words too.
  markFieldNewsSeen();
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter>
        <LogbookProvider>
          <TackleProvider>
            <HomePage />
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

const buttons = (box: HTMLElement) => [...box.querySelectorAll("button")].map((button) => button.textContent);

describe("round 120 ideas: Home's Next for a dawn and a dusk with a fish loose on their water", () => {
  it("says Out now and offers no plan to copy or add to the calendar", async () => {
    const box = await home({ spots: [water], trips: [trip("dawn", TODAY), trip("dusk", TODAY)], catches: [fish("1", null, 21)] });
    expect(box.textContent).toContain("Out now");
    expect(buttons(box)).not.toContain("Add to calendar");
    expect(buttons(box)).not.toContain("Copy the plan");
  });

  it("still offers both for today's plan with no fish yet", async () => {
    const box = await home({ spots: [water], trips: [trip("old", "2026-10-01"), trip("dusk", TODAY)], catches: [fish("1", "old", 1)] });
    expect(box.textContent).not.toContain("Out now");
    expect(buttons(box)).toContain("Add to calendar");
    expect(buttons(box)).toContain("Copy the plan");
  });
});

describe("round 120 ideas: Home's fish this week", () => {
  // 2026-10-21 is a Wednesday: the week runs from Monday the 19th.
  it("are counted beside the month's when the month holds more", async () => {
    const box = await home({ spots: [water], trips: [trip("a", "2026-10-05"), trip("b", "2026-10-19")], catches: [fish("1", "a", 5), fish("2", "b", 19), fish("3", "b", 19, 11)] });
    const link = [...box.querySelectorAll("a")].find((anchor) => anchor.textContent === "2 this week");
    expect(link?.getAttribute("href")).toContain("this+week");
    expect(box.textContent).toContain("3 this month");
  });

  it("are not said again when they are all the month's", async () => {
    const box = await home({ spots: [water], trips: [trip("b", "2026-10-19")], catches: [fish("1", "b", 19), fish("2", "b", 20)] });
    expect(box.textContent).toContain("2 this month");
    expect(box.textContent).not.toContain("this week");
  });

  it("are said for a week begun last month, beside the month's fewer", async () => {
    vi.setSystemTime(new Date(2026, 9, 1, 12));
    // Thursday 1 October: the week began Monday 28 September.
    const box = await home({ spots: [water], trips: [trip("a", "2026-09-28"), trip("b", "2026-10-01")], catches: [fish("1", "a", 28, 10, 8), fish("2", "b", 1)] });
    expect(box.textContent).toContain("2 this week");
    expect(box.textContent).toContain("1 this month");
  });
});
