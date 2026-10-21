// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { GearPage } from "./gear/GearPage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { outingCatches } from "./outingFish";
import { setLang } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water: Spot = { id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Spot;
const trip = (id: string, date: string, title = ""): Trip => ({ id, date, spotId: "own", title, note: "" }) as Trip;
const fish = (id: string, tripId: string | null, day: number, lure: string): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure, spotId: "own", tripId, caughtAt: new Date(2026, 8, day, 10).toISOString(), note: "", weather: null }) as CatchEntry;

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

async function monthHeads(book: Logbook): Promise<(string | null)[]> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
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
  return [...box.querySelectorAll(".month-head")].map((head) => head.textContent);
}

const twoOutings = [trip("a", "2026-09-05"), trip("b", "2026-09-12")];

describe("round 121 ideas: Tackle's Recent months", () => {
  it("names the lure that took most of a month's fish", async () => {
    const catches = [fish("1", "a", 5, "Spinner"), fish("2", "b", 12, "spinner "), fish("3", "b", 12, "Jig")];
    expect(await monthHeads({ spots: [water], trips: twoOutings, catches })).toEqual(["September 2026 · 2 outings · 3 fish · best on Spinner"]);
  });

  it("names none on a tie or a single fish", async () => {
    const tie = [fish("1", "a", 5, "Spinner"), fish("2", "a", 5, "Spinner"), fish("3", "b", 12, "Jig"), fish("4", "b", 12, "Jig")];
    expect((await monthHeads({ spots: [water], trips: twoOutings, catches: tie }))[0]).not.toContain("best on");
    document.body.innerHTML = "";
    expect((await monthHeads({ spots: [water], trips: twoOutings, catches: [fish("1", "a", 5, "Spinner")] }))[0]).not.toContain("best on");
  });

  it("counts a fish logged loose on the day's only outing on its water, as the month's fish count does", async () => {
    const catches = [fish("1", "a", 5, "Spinner"), fish("2", null, 5, "Spinner"), fish("3", "b", 12, "Jig")];
    expect(await monthHeads({ spots: [water], trips: twoOutings, catches })).toEqual(["September 2026 · 2 outings · 3 fish · best on Spinner"]);
  });

  it("leaves out a loose fish of a dawn and a dusk, as the count does", async () => {
    const trips = [trip("dawn", "2026-09-05", "Dawn"), trip("dusk", "2026-09-05", "Dusk")];
    const catches = [fish("1", "dawn", 5, "Spinner"), fish("2", null, 5, "Spinner"), fish("3", "dusk", 5, "Jig")];
    expect(await monthHeads({ spots: [water], trips, catches })).toEqual(["September 2026 · 2 outings · 2 fish"]);
    expect(outingCatches({ spots: [water], trips, catches })("dawn").map((entry) => entry.id)).toEqual(["1"]);
  });

  it("says it in Polish", async () => {
    setLang("pl");
    const catches = [fish("1", "a", 5, "Spinner"), fish("2", "b", 12, "Spinner")];
    expect((await monthHeads({ spots: [water], trips: twoOutings, catches }))[0]).toContain("najlepiej na: Obrotówka");
  });
});
