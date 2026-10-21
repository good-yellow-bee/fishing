// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, TackleItem, Trip } from "@stillwater/shared";
import { GearPage } from "./gear/GearPage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { TACKLE_STORAGE_KEY } from "./gear/storage";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TODAY = "2026-10-21";
const water: Spot = { id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Spot;
const trip = (id: string, date: string, title = ""): Trip => ({ id, date, spotId: "own", title, note: "" }) as Trip;
const fish = (id: string, tripId: string | null, day: number, lure = "Jig"): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure, spotId: "own", tripId, caughtAt: new Date(2026, 9, day, 10).toISOString(), note: "", weather: null }) as CatchEntry;
const item = (id: string, tripId: string, label: string): TackleItem => ({ id, tripId, label, packed: true });

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

async function gear(book: Logbook, items: TackleItem[]): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  stored.set(TACKLE_STORAGE_KEY, JSON.stringify({ items }));
  markFieldNewsSeen();
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter>
        <LogbookProvider>
          <TackleProvider>
            <GearPage />
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

describe("round 121 fixes: Tackle", () => {
  it("says Out now for a dawn and a dusk with a fish loose on their water, with no plan to copy, as Home's Next", async () => {
    const box = await gear({ spots: [water], trips: [trip("dawn", TODAY, "Dawn"), trip("dusk", TODAY, "Dusk")], catches: [fish("1", null, 21)] }, [item("a", "dawn", "Jig"), item("b", "dusk", "Spoon")]);
    const lines = [...box.querySelectorAll(".tackle-trip:not(.tackle-past) .meta")].map((line) => line.textContent);
    expect(lines).toEqual(["Out now · Own Lake", "Out now · Own Lake"]);
    expect(box.textContent).not.toContain("Copy the plan");
  });

  it("still offers the plan of today's outing before anything bit", async () => {
    const box = await gear({ spots: [water], trips: [trip("dawn", TODAY, "Dawn")], catches: [] }, [item("a", "dawn", "Jig")]);
    expect(box.querySelector(".tackle-trip .meta")?.textContent).toBe("Today · Own Lake");
    expect(box.textContent).toContain("Copy the plan");
  });

  it("counts today's outing in the lure record once a fish is logged loose on its water", async () => {
    const box = await gear({ spots: [water], trips: [trip("old", "2026-10-05"), trip("today", TODAY)], catches: [fish("1", null, 21, "Spinner")] }, [item("a", "old", "Spinner"), item("b", "today", "Spinner")]);
    expect(box.querySelector(".lure-record li")?.textContent).toContain("1 fish · 2 outings");
  });
});
