// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { HomePage } from "./HomePage";
import { SpotsPage } from "./SpotPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";

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

const cardTallies = (box: HTMLElement) => [...box.querySelectorAll(".trip-card")].map((card) => card.textContent ?? "");

describe("round 125 fixes: Home's Coming up", () => {
  it("says Out now on today's outings with a fish loose on their water, as Next above them does", async () => {
    const box = await show({ spots: [water("own", "Own Lake")], trips: [trip("dawn", TODAY, "own", "Dawn"), trip("dusk", TODAY, "own", "Dusk")], catches: [fish("1", null, 21, 10)] }, <HomePage />);
    expect(box.querySelector(".stat-row")?.textContent).toContain("Out now");
    const cards = cardTallies(box);
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toContain("Out now");
      expect(card).not.toContain("Planned");
    }
  });

  it("still says Planned on today's outing before anything bit", async () => {
    const box = await show({ spots: [water("own", "Own Lake")], trips: [trip("eve", TODAY, "own", "Evening")], catches: [] }, <HomePage />);
    expect(cardTallies(box)[0]).toContain("Planned");
  });
});

describe("round 125 fixes: Waters under Longest rested", () => {
  it("says Fished here today in the small hours for the water whose outing last evening is still going, as its page does", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 3));
    stored.set("stillwater.field-log.spot-order.v1", "rested");
    const book: Logbook = {
      spots: [water("own", "Own Lake"), water("mill", "Mill Pond"), water("oak", "Oak Lake")],
      trips: [trip("night", "2026-10-20", "own", "Night"), trip("mill", "2026-10-19", "mill"), trip("oak", "2026-10-01", "oak")],
      catches: [fish("1", "night", 20, 23), fish("2", "mill", 19, 8, "mill"), fish("3", "oak", 1, 8, "oak")],
    };
    const box = await show(book, <SpotsPage />);
    const card = (name: string) => [...box.querySelectorAll(".spot-card")].find((each) => each.querySelector("h2, h3")?.textContent?.includes(name))?.textContent ?? "";
    expect(card("Own Lake")).toContain("Fished here today");
    expect(card("Mill Pond")).toContain("Last fished here 2 days ago");
  });
});
