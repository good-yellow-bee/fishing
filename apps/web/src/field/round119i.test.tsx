// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook, type Spot, type Trip } from "@stillwater/shared";
import { setLang } from "../i18n";
import { CatchFormPage, formOutings } from "./CatchPages";
import { LogbookProvider } from "./LogbookState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { tripForFish } from "./suggestions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water = (id: string, name = "Own Lake") => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, more: Partial<Trip> = {}): Trip => ({ id, date, spotId: "own", title: "", note: "", ...more }) as Trip;
const fish = (id: string, species: string, caughtAt: string, more: Partial<CatchEntry> = {}): CatchEntry =>
  ({ id, species, measure: { kind: "length", inches: 20 }, lure: "Jig", spotId: "own", tripId: null, caughtAt: new Date(caughtAt).toISOString(), note: "", weather: null, ...more }) as CatchEntry;

afterEach(() => {
  setLang("en");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const draw = async (url: string, book: Logbook) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00"));
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[url]}>
        <LogbookProvider>
          <Routes>
            <Route path="/catches/new" element={<CatchFormPage />} />
            <Route path="/catches/:catchId/edit" element={<CatchFormPage />} />
          </Routes>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
};

describe("round 119 ideas: a dawn and a dusk with no fish yet", () => {
  it("files a new fish on the one under way, a fish lost or missed, whichever was planned first", () => {
    const book: Logbook = { spots: [water("own")], trips: [trip("dusk", "2026-10-20"), trip("dawn", "2026-10-20", { lost: 1 })], catches: [] };
    expect(tripForFish(book, "own", "2026-10-20T09:30")?.id).toBe("dawn");
    expect(tripForFish({ ...book, trips: [trip("dawn", "2026-10-20"), trip("dusk", "2026-10-20", { missed: 1 })] }, "own", "2026-10-20T09:30")?.id).toBe("dusk");
  });

  it("still files it on the one with a fish nearer that time", () => {
    const book: Logbook = { spots: [water("own")], trips: [trip("dawn", "2026-10-20", { lost: 1 }), trip("dusk", "2026-10-20")], catches: [fish("1", "Pike", "2026-10-20T18:00:00", { tripId: "dusk" })] };
    expect(tripForFish(book, "own", "2026-10-20T19:00")?.id).toBe("dusk");
  });
});

describe("round 119 ideas: the catch form's outings leave out the sample week's", () => {
  const sample = sampleLogbook(new Date(2026, 9, 18, 12));
  const book: Logbook = { ...sample, spots: [...sample.spots, water("own")], catches: [...sample.catches, fish("own-1", "Pike", "2026-10-19T08:00:00")] };
  const at = (water: string, existing?: CatchEntry, keep?: string) => formOutings(book, water, existing, [keep]).map((each) => each.id);

  it("offers none of them for the angler's own fish", () => {
    expect(at("spot-mill")).toEqual([]);
  });

  it("keeps the one the fish is on, the one opened from or picked, and all of them for a sample fish", () => {
    expect(at("spot-mill", { ...book.catches.at(-1)!, tripId: "trip-mill" })).toEqual(["trip-mill"]);
    expect(at("spot-mill", undefined, "trip-mill")).toEqual(["trip-mill"]);
    const sampleFish = sample.catches.find((entry) => entry.tripId === "trip-mill")!;
    expect(at("spot-mill", sampleFish)).toEqual(["trip-mill"]);
    expect(at("spot-quarry", sampleFish)).toContain("trip-quarry-next");
  });

  it("lists only the angler's own outings on the form", async () => {
    const box = await draw("/catches/new?spot=spot-mill", book);
    const options = [...box.querySelectorAll('select[name="trip"] option')].map((option) => option.getAttribute("value"));
    expect(options).not.toContain("trip-mill");
  });
});

describe("round 119 ideas: the Polish form's kinds at a water", () => {
  it("count two names that read as one kind together before taking the top three", async () => {
    setLang("pl");
    const catches = [
      fish("1", "European perch", "2026-06-01T08:00:00"),
      fish("2", "Northern pike", "2026-06-02T08:00:00"),
      fish("3", "Perch", "2026-06-03T08:00:00"),
      fish("4", "Roach", "2026-06-04T08:00:00"),
      fish("5", "Tench", "2026-06-05T08:00:00"),
    ];
    const box = await draw("/catches/1/edit", { spots: [water("own")], trips: [], catches });
    const chips = [...box.querySelector("p.lure-tips")!.querySelectorAll("button.lure-tip")].map((chip) => chip.textContent);
    expect(chips).toEqual(["Okoń", "Szczupak", "Płoć"]);
  });
});
