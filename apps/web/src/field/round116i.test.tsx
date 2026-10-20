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

const fish = (id: string, caughtAt: string, inches: number, released = false): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: { kind: "length", inches },
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
  it("says the record a season's new best beat, and how many of the kind went back, opening them", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T12:00:00"));
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
    stored.set(
      LOGBOOK_STORAGE_KEY,
      JSON.stringify({
        spots: [{ id: "a", name: "Home Lake", waterType: "lake", notes: "", bestConditions: "" }],
        trips: [],
        catches: [fish("1", "2025-06-01T08:00:00", 30), fish("2", "2026-06-01T08:00:00", 34, true), fish("3", "2026-07-01T08:00:00", 28)],
      }),
    );
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
    const card = [...box.querySelectorAll("article.spot-card")].find((each) => each.textContent?.includes("Northern pike"))!;
    expect(card.textContent).toContain("Previous best: 30 in (2025)");
    const released = [...card.querySelectorAll("a")].find((link) => link.textContent === "Released: 1 of 2")!;
    expect(new URLSearchParams(released.getAttribute("href")!.split("?")[1]).get("find")).toMatch(/^species:"Northern pike" \+ Released \+ 2026/);
  });
});
