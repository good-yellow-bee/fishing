// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { sampleLogbook, type Logbook, type Spot } from "@stillwater/shared";
import { BestsPage } from "./bests/BestsPage";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

async function bests(book: Logbook): Promise<string> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={["/bests"]}>
        <LogbookProvider>
          <BestsPage />
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box.textContent ?? "";
}

describe("round 122: Bests beside the sample week with only a water of the angler's own", () => {
  // Made a week ago: its two plans have passed blank, after five outings that each gave a fish.
  const sample = sampleLogbook(new Date(2026, 9, 14, 12));
  const book: Logbook = { ...sample, spots: [...sample.spots, { id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Spot] };

  it("leaves its blank plans out of the runs, as Trips' streak does", async () => {
    const text = await bests(book);
    expect(text).toContain("Outings in a row with a fish: 5, and still going");
    expect(text).not.toContain("without a fish");
    expect(text).not.toContain("Outings since your last fish");
  });

  it("leaves them out of the calendar, as the days on the water count", async () => {
    const text = await bests(book);
    expect(text).toContain("Days on the water in 2026: 5");
    expect(text).toContain("October 2026 · 4 days out · 4 outings");
  });

  it("still counts them while the sample week is all the book holds", async () => {
    const text = await bests(sample);
    expect(text).toContain("October 2026 · 6 days out · 6 outings");
  });
});
