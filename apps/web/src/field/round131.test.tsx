// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { sampleLogbook, type CatchEntry, type Logbook, type Spot, type Trip } from "@stillwater/shared";
import { HomePage } from "./HomePage";
import { SpotsPage } from "./SpotPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, spotId: string, title = ""): Trip => ({ id, date, spotId, title, note: "" }) as Trip;
const fish = (id: string, tripId: string | null, at: Date, spotId: string): CatchEntry =>
  ({ id, species: "Carp", measure: { kind: "length", inches: 20 }, lure: "Boilie", spotId, tripId, caughtAt: at.toISOString(), note: "", weather: null }) as CatchEntry;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 14));
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

const groups = (box: HTMLElement) =>
  [...box.querySelectorAll(".card-grid")].map((grid) => ({
    label: grid.previousElementSibling?.classList.contains("waters-group") ? grid.previousElementSibling.textContent : null,
    waters: [...grid.querySelectorAll("h3, h2")].map((heading) => heading.textContent),
  }));

describe("round 131 fixes: the Waters list Home's count opens", () => {
  it("puts the sample week's waters under their own heading once the angler has an outing of their own, with no fish yet", async () => {
    const sample = sampleLogbook(new Date(2026, 9, 22, 12));
    const book = { ...sample, spots: [...sample.spots, water("own", "Home Pond")], trips: [...sample.trips, trip("plan", "2026-10-24", "own")] };
    const home = await show(book, <HomePage />);
    expect(home.querySelector(".stat-row a[href='/spots']")?.textContent).toBe("1");
    document.body.innerHTML = "";
    const [own, invented, ...rest] = groups(await show(book, <SpotsPage />));
    expect(own).toEqual({ label: null, waters: ["Home Pond"] });
    expect(invented!.label).toBe(`From the sample week (${sample.spots.length})`);
    expect(invented!.waters).toHaveLength(sample.spots.length);
    expect(rest).toEqual([]);
  });

  it("keeps a sample water with an outing of the angler's own among theirs, as Home counts it", async () => {
    const sample = sampleLogbook(new Date(2026, 9, 22, 12));
    const [planned] = sample.spots;
    const book = { ...sample, trips: [...sample.trips, trip("plan", "2026-10-24", planned!.id, "Mine")] };
    const home = await show(book, <HomePage />);
    expect(home.querySelector(".stat-row a[href='/spots']")?.textContent).toBe("1");
    document.body.innerHTML = "";
    const [own, invented] = groups(await show(book, <SpotsPage />));
    expect(own!.waters).toEqual([planned!.name]);
    expect(invented!.label).toBe(`From the sample week (${sample.spots.length - 1})`);
  });

  it("leaves a book of only the sample week in one list", async () => {
    const sample = sampleLogbook(new Date(2026, 9, 22, 12));
    const list = groups(await show(sample, <SpotsPage />));
    expect(list).toHaveLength(1);
    expect(list[0]!.label).toBeNull();
  });
});

describe("round 131 fixes: Home's This week in years past", () => {
  it("offers a day's fish once, on its newest fish, a night's small hours on its outing's day", async () => {
    const book: Logbook = {
      spots: [water("a", "Cedar Bend"), water("b", "Mill Pond")],
      trips: [trip("night", "2025-10-20", "a", "Night carp"), trip("day", "2025-10-23", "b")],
      catches: [
        fish("dusk", "night", new Date(2025, 9, 20, 22), "a"),
        fish("small", "night", new Date(2025, 9, 21, 1), "a"),
        fish("next", "day", new Date(2025, 9, 23, 9), "b"),
      ],
    };
    const box = await show(book, <HomePage />);
    const lines = [...box.querySelectorAll(".years-ago > .meta")];
    expect(lines.map((line) => line.textContent)).toEqual(["1 year ago · Every fish that day", "1 year ago · Every fish that day", "1 year ago"]);
    const links = lines.map((line) => decodeURIComponent(line.querySelector("a")?.getAttribute("href") ?? ""));
    expect(links[0]).toContain("2025-10-23");
    expect(links[1]).toContain("2025-10-20");
  });

  it("offers a night's day once when a fish of the next day sorts between its fish", async () => {
    const book: Logbook = {
      spots: [water("a", "Cedar Bend"), water("b", "Mill Pond")],
      trips: [trip("night", "2025-10-20", "a", "Night carp")],
      catches: [
        fish("dusk", "night", new Date(2025, 9, 20, 22), "a"),
        fish("loose", null, new Date(2025, 9, 21, 0, 30), "b"),
        fish("small", "night", new Date(2025, 9, 21, 2), "a"),
      ],
    };
    const box = await show(book, <HomePage />);
    const links = [...box.querySelectorAll(".years-ago > .meta")].map((line) => decodeURIComponent(line.querySelector("a")?.getAttribute("href") ?? ""));
    expect(links[0]).toContain("2025-10-20");
    expect(links[1]).toContain("2025-10-21");
    expect(links[2]).toBe("");
  });
});
