// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, TackleItem, Trip } from "@stillwater/shared";
import { GearPage } from "./gear/GearPage";
import { SpotMapPage } from "./map/SpotMapPage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { TACKLE_STORAGE_KEY } from "./gear/storage";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { setLang } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water = (id: string, name: string, place?: { lat: number; lng: number }): Spot => ({ id, name, waterType: "lake", notes: "", bestConditions: "", ...(place ? { place } : {}) }) as Spot;
const trip = (id: string, date: string, spotId: string): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;
const fish = (id: string, tripId: string | null, spotId: string, at: Date, lure: string, species = "Perch"): CatchEntry =>
  ({ id, species, measure: { kind: "length", inches: 8 }, lure, spotId, tripId, caughtAt: at.toISOString(), note: "", weather: null }) as CatchEntry;
const item = (id: string, tripId: string, label: string): TackleItem => ({ id, tripId, label, packed: true });

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
});
afterEach(() => {
  setLang("en");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function show(page: ReactNode, book: Logbook, items: TackleItem[] = []): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  stored.set(TACKLE_STORAGE_KEY, JSON.stringify({ items }));
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

const lureRow = (box: HTMLElement, lure: string) => [...box.querySelectorAll(".lure-record li")].find((row) => row.textContent?.startsWith(lure))!;
const sept = (day: number) => new Date(2026, 8, day, 10);

describe("round 130 ideas: the kind a lure takes most", () => {
  const spots = [water("a", "Cedar Bend"), water("b", "")];
  const trips = [trip("t1", "2026-09-01", "a"), trip("t2", "2026-09-05", "a"), trip("t3", "2026-09-08", "b")];
  const items = [item("i1", "t1", "Spinner"), item("i2", "t2", "Spinner"), item("i3", "t3", "Spinner"), item("i4", "t1", "Jig")];

  it("names the kind that led, opening the lure's fish of that kind", async () => {
    const catches = [fish("1", "t1", "a", sept(1), "Spinner"), fish("2", "t2", "a", sept(5), "spinner", "perch"), fish("3", "t2", "a", sept(5), "Spinner", "Pike"), fish("4", "t1", "a", sept(1), "Jig")];
    const box = await show(<GearPage />, { spots, trips, catches }, items);
    const link = [...lureRow(box, "Spinner").querySelectorAll("a")].find((a) => a.textContent === "mostly Perch (2)")!;
    expect(new URLSearchParams(link.getAttribute("href")!.split("?")[1]).get("find")).toBe('lure:"Spinner" + species:"Perch"');
  });

  it("says all of one kind, and nothing under three fish or on a tie", async () => {
    const all = [fish("1", "t1", "a", sept(1), "Spinner"), fish("2", "t2", "a", sept(5), "Spinner"), fish("3", "t2", "a", sept(5), "Spinner"), fish("4", "t1", "a", sept(1), "Jig"), fish("5", "t1", "a", sept(1), "Jig")];
    let box = await show(<GearPage />, { spots, trips, catches: all }, items);
    expect(lureRow(box, "Spinner").textContent).toContain("all Perch");
    expect(lureRow(box, "Jig").textContent).not.toMatch(/all |mostly /);
    document.body.innerHTML = "";
    const tie = [fish("1", "t1", "a", sept(1), "Spinner"), fish("2", "t2", "a", sept(5), "Spinner", "Pike"), fish("3", "t2", "a", sept(5), "Spinner", "Roach"), fish("6", "t2", "a", sept(5), "Spinner", "Roach"), fish("7", "t2", "a", sept(5), "Spinner")];
    box = await show(<GearPage />, { spots, trips, catches: tie }, items);
    expect(lureRow(box, "Spinner").textContent).not.toMatch(/all |mostly /);
  });

  it("names, unlinked, the kind at a water with no name picked", async () => {
    const catches = [fish("1", "t1", "a", sept(1), "Spinner"), fish("2", "t3", "b", sept(8), "Spinner"), fish("3", "t3", "b", sept(8), "Spinner"), fish("4", "t3", "b", sept(8), "Spinner", "Pike")];
    const box = await show(<GearPage />, { spots, trips, catches }, items);
    const blank = [...box.querySelectorAll<HTMLButtonElement>(".spot-order button")].find((button) => button.textContent?.startsWith("Water with no name"))!;
    await act(async () => blank.click());
    const row = lureRow(box, "Spinner");
    expect(row.textContent).toContain("mostly Perch (2)");
    expect([...row.querySelectorAll("a")].some((a) => a.textContent?.startsWith("mostly"))).toBe(false);
  });

  it("says it in Polish", async () => {
    setLang("pl");
    const catches = [fish("1", "t1", "a", sept(1), "Spinner"), fish("2", "t2", "a", sept(5), "Spinner"), fish("3", "t2", "a", sept(5), "Spinner", "Pike")];
    const box = await show(<GearPage />, { spots, trips, catches }, items);
    expect(box.querySelector(".lure-record")!.textContent).toContain("najczęściej: Okoń (2)");
  });
});

describe("round 130 ideas: the Map says a water's best month while it is that month", () => {
  const spots = [water("a", "Kowal Lake", { lat: 10, lng: 10 }), water("b", "Mill Pond", { lat: 10.1, lng: 10.1 })];
  const octoberLead = [fish("1", null, "a", new Date(2025, 9, 3, 9), "Jig"), fish("2", null, "a", new Date(2025, 9, 4, 9), "Jig"), fish("3", null, "a", new Date(2026, 9, 2, 9), "Jig"), fish("4", null, "a", sept(1), "Jig")];
  const rowText = (box: HTMLElement, name: string) => [...box.querySelectorAll(".map-index li")].find((row) => row.querySelector("a")?.textContent === name)!.textContent!;

  it("says it on the water whose best month this is", async () => {
    const box = await show(<SpotMapPage />, { spots, trips: [], catches: [...octoberLead, fish("5", null, "b", sept(2), "Jig")] });
    expect(rowText(box, "Kowal Lake")).toContain("October is its best month");
    expect(rowText(box, "Mill Pond")).not.toContain("best month");
  });

  it("says nothing with every fish in one month, under three, or on a tie", async () => {
    const oneMonth = octoberLead.slice(0, 3);
    let box = await show(<SpotMapPage />, { spots, trips: [], catches: oneMonth });
    expect(rowText(box, "Kowal Lake")).not.toContain("best month");
    document.body.innerHTML = "";
    box = await show(<SpotMapPage />, { spots, trips: [], catches: [...octoberLead.slice(0, 2), octoberLead[3]!] });
    expect(rowText(box, "Kowal Lake")).not.toContain("best month");
    document.body.innerHTML = "";
    box = await show(<SpotMapPage />, { spots, trips: [], catches: [...octoberLead, fish("6", null, "a", sept(2), "Jig"), fish("7", null, "a", sept(3), "Jig")] });
    expect(rowText(box, "Kowal Lake")).not.toContain("best month");
  });

  it("counts a night fish in its outing's month", async () => {
    // Fish just past midnight on November 1 on an October 31 evening outing count for October.
    const late = (id: string) => fish(id, "eve", "a", new Date(2025, 10, 1, 1), "Jig");
    const book = { spots, trips: [trip("eve", "2025-10-31", "a")], catches: [late("1"), late("2"), late("3"), fish("4", null, "a", new Date(2025, 10, 5, 9), "Jig")] };
    const box = await show(<SpotMapPage />, book);
    expect(rowText(box, "Kowal Lake")).toContain("October is its best month");
  });

  it("says it in Polish", async () => {
    setLang("pl");
    const box = await show(<SpotMapPage />, { spots, trips: [], catches: octoberLead });
    expect(rowText(box, "Kowal Lake")).toContain("październik to tu najlepszy miesiąc");
  });
});
