// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { CatchesPage, CatchFormPage } from "./CatchPages";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { twinNamesAmong } from "./spotOrder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const spot = (id: string, name: string) => ({ id, name, waterType: "lake" as const, notes: "", bestConditions: "" });
const fish = (id: string, spotId: string, day: number, species = "Roach", lure = "Jig"): CatchEntry => ({
  id,
  species,
  measure: { kind: "length", inches: 8 + day / 10 },
  lure,
  spotId,
  tripId: null,
  caughtAt: new Date(2026, 9, day, 7).toISOString(),
  note: "",
  weather: null,
});

// Two waters imported with no name, beside a named one.
const spots = [spot("own", "Own Lake"), spot("blank", "  "), spot("bare", "")];
const catches = [fish("1", "blank", 2), fish("2", "blank", 3), fish("3", "blank", 4), fish("4", "bare", 5), fish("5", "bare", 6), fish("6", "own", 7)];

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const draw = async (url: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  markFieldNewsSeen();
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify({ spots, trips: [], catches }));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[url]}>
        <LogbookProvider>
          <Routes>
            <Route path="/catches" element={<CatchesPage />} />
            <Route path="/catches/new" element={<CatchFormPage />} />
          </Routes>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
};

describe("round 129: catch pages with a water of no name", () => {
  it("says which water the form's picks come from", async () => {
    const box = await draw("/catches/new?spot=blank");
    expect(box.querySelector(".lure-tips")?.textContent).toMatch(/^From Water with no name: /);
  });

  it("tells two waters of no name apart in the form's water list", async () => {
    expect(twinNamesAmong([spot("a", " "), spot("b", ""), spot("c", "Own Lake")])).toEqual(new Set([""]));
    const box = await draw("/catches/new?spot=blank");
    const options = [...box.querySelectorAll('select[name="spot"] option')].map((option) => option.textContent);
    expect(options).toEqual(["Own Lake", "Water with no name · 3 fish", "Water with no name · 2 fish"]);
  });

  it("names the leading water of a search, keeping two waters of no name apart", async () => {
    const text = (await draw("/catches?find=roach")).textContent;
    // The two blank waters' 5 fish are not one water's.
    expect(text).toContain("Most from Water with no name (3).");
  });

  it("names a water of no name in a search's copied summary", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const box = await draw("/catches?find=roach");
    const copy = [...box.querySelectorAll("button")].find((button) => button.textContent === "Copy a summary")!;
    await act(async () => copy.click());
    const rows = (writeText.mock.calls[0] as unknown as [string])[0].split("\n").filter((line) => line.startsWith("- "));
    expect(rows.map((row) => row.split(", ").at(-1))).toEqual([...Array(5).fill("Water with no name"), "Own Lake"]);
  });
});
