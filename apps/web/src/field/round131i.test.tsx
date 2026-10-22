// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { HomePage } from "./HomePage";
import { CatchFormPage } from "./CatchPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { CATCH_DRAFT_KEY } from "./catchDraft";
import { markFieldNewsSeen } from "./fieldNews";
import { reloadLang, setLang } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, spotId: string): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;
const fish = (id: string, species: string, tripId: string | null, at: Date): CatchEntry =>
  ({ id, species, measure: { kind: "length", inches: 20 }, lure: "Spoon", spotId: "a", tripId, caughtAt: at.toISOString(), note: "", weather: null }) as CatchEntry;
const draft = (species: string) =>
  JSON.stringify({ species, measureKind: "length", amount: "", lure: "", spotId: "a", tripId: "", caughtAt: "", note: "", sky: "", wind: "", waterTemp: "", timeTouched: false, units: "in", savedAt: new Date(2026, 9, 22, 13).toISOString() });

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 14));
});
afterEach(() => {
  setLang("en");
  reloadLang();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function show(book: Logbook, url = "/"): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  markFieldNewsSeen();
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[url]}>
        <LogbookProvider>
          <TackleProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/catches/new" element={<CatchFormPage />} />
            </Routes>
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

const pikeBook = (species: string): Logbook => ({
  spots: [water("a", "Cedar Bend")],
  trips: [],
  catches: [fish("1", species, null, new Date(2026, 9, 2, 8)), fish("2", species, null, new Date(2026, 9, 3, 8))],
});

describe("round 131 ideas: the unsaved fish on Home", () => {
  it("names the kind as the book writes it, in Polish too", async () => {
    setLang("pl");
    stored.set(CATCH_DRAFT_KEY, draft("szczupak "));
    const box = await show(pikeBook("Szczupak"));
    expect(box.querySelector(".kept-draft p")?.textContent).toContain(": Szczupak.");
  });

  it("names it as the book writes it in English, and as typed when the book has none", async () => {
    stored.set(CATCH_DRAFT_KEY, draft("northern pike "));
    expect((await show(pikeBook("Northern pike"))).querySelector(".kept-draft p")?.textContent).toBe("A fish you started logging was not saved: Northern pike.");
    document.body.innerHTML = "";
    expect((await show(pikeBook("Perch"))).querySelector(".kept-draft p")?.textContent).toBe("A fish you started logging was not saved: northern pike.");
  });

  it("names it the same way on the catch form", async () => {
    stored.set(CATCH_DRAFT_KEY, draft("northern pike"));
    const box = await show(pikeBook("Northern pike"), "/catches/new");
    expect(box.querySelector(".kept-draft p")?.textContent).toBe("A fish you started logging was not saved: Northern pike.");
  });

  it("lets the fish go from Home, as the catch form does", async () => {
    stored.set(CATCH_DRAFT_KEY, draft("Perch"));
    const box = await show(pikeBook("Perch"));
    const go = [...box.querySelectorAll<HTMLButtonElement>(".kept-draft button")].find((button) => button.textContent === "Let it go")!;
    await act(async () => go.click());
    expect(box.querySelector(".kept-draft")).toBeNull();
    expect(stored.has(CATCH_DRAFT_KEY)).toBe(false);
    expect(document.activeElement).toBe(box.querySelector("h1"));
  });
});

describe("round 131 ideas: This week in years past by the outing's day", () => {
  // Today is 22 October 2026: the week in years past runs 19 to 25 October.
  const book: Logbook = {
    spots: [water("a", "Cedar Bend")],
    trips: [trip("late", "2025-10-25", "a"), trip("early", "2025-10-18", "a"), trip("dusk", "2025-10-22", "a")],
    catches: [
      fish("in", "Carp", "late", new Date(2025, 9, 26, 1)),
      fish("out", "Carp", "early", new Date(2025, 9, 19, 1)),
      fish("dusk", "Carp", "dusk", new Date(2025, 9, 22, 20)),
    ],
  };

  it("takes a night's small hours in or out of the week by its outing's day, and says how long ago", async () => {
    const box = await show(book);
    const shown = [...box.querySelectorAll(".years-ago")];
    expect(shown).toHaveLength(2);
    expect(shown.map((row) => row.querySelector(".meta")?.textContent)).toEqual(["1 year ago · Every fish that day", "1 year ago · Every fish that day"]);
    expect(decodeURIComponent(shown[0]!.querySelector(".meta a")?.getAttribute("href") ?? "")).toContain("2025-10-25");
  });
});
