// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { BestsPage } from "./bests/BestsPage";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fish = (id: string, caughtAt: string, inches: number, released = false, pounds?: number): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: { kind: "length", inches },
  ...(pounds ? { alsoMeasure: { kind: "weight" as const, pounds } } : {}),
  lure: "Spoon",
  spotId: "a",
  tripId: null,
  caughtAt: new Date(caughtAt).toISOString(),
  note: "",
  weather: null,
  released,
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("round 116 ideas: a kind's card on Bests", () => {
  const draw = async (catches: CatchEntry[]) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T12:00:00"));
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
    stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify({ spots: [{ id: "a", name: "Home Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [], catches }));
    const box = document.createElement("div");
    document.body.append(box);
    await act(async () => {
      createRoot(box).render(
        <MemoryRouter initialEntries={["/bests?year=2026"]}>
          <LogbookProvider>
            <BestsPage />
          </LogbookProvider>
        </MemoryRouter>,
      );
    });
    return [...box.querySelectorAll("article.spot-card")].find((each) => each.textContent?.includes("Northern pike"))!;
  };

  it("says the record a season's new best beat, opening that fish, and how many of the kind went back, opening them", async () => {
    const card = await draw([fish("1", "2025-06-01T08:00:00", 30), fish("2", "2026-06-01T08:00:00", 34, true), fish("3", "2026-07-01T08:00:00", 28)]);
    const previous = [...card.querySelectorAll("a")].find((link) => link.textContent === "Previous best: 30 in (2025)")!;
    expect(previous.getAttribute("href")).toBe("/catches/1");
    const released = [...card.querySelectorAll("a")].find((link) => link.textContent === "Released: 1 of 2")!;
    expect(released.getAttribute("aria-label")).toBe("Northern pike, Released: 1 of 2");
    expect(new URLSearchParams(released.getAttribute("href")!.split("?")[1]).get("find")).toMatch(/^species:"Northern pike" \+ Released \+ 2026/);
  });

  it("names one old fish that held both records once, and says nothing when no record fell", async () => {
    const both = await draw([fish("1", "2025-06-01T08:00:00", 30, false, 8), fish("2", "2026-06-01T08:00:00", 34, false, 10)]);
    expect(both.textContent).toContain("Previous best: 30 in, 8 lb (2025)");
    document.body.innerHTML = "";
    const none = await draw([fish("1", "2025-06-01T08:00:00", 30), fish("2", "2026-06-01T08:00:00", 28)]);
    expect(none.textContent).not.toContain("Previous best");
    expect(none.textContent).not.toContain("Released");
  });
});
