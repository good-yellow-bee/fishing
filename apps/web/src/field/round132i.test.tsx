// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Measure, Spot } from "@stillwater/shared";
import { BestsPage } from "./bests/BestsPage";
import { SpotsPage } from "./SpotPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { setLang } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mill = { id: "mill", name: "Mill pond", waterType: "lake", notes: "", bestConditions: "" } as Spot;
const inches = (value: number): Measure => ({ kind: "length", inches: value });
const pounds = (value: number): Measure => ({ kind: "weight", pounds: value });
const fish = (id: string, species: string, measure: Measure, alsoMeasure?: Measure): CatchEntry =>
  ({ id, species, measure, alsoMeasure, lure: "Jig", spotId: "mill", tripId: null, caughtAt: new Date(2026, 8, Number(id), 9).toISOString(), note: "", weather: null }) as CatchEntry;

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

async function show(catches: CatchEntry[], page: ReactNode, at: string): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify({ spots: [mill], trips: [], catches } satisfies Logbook));
  markFieldNewsSeen();
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[at]}>
        <LogbookProvider>
          <TackleProvider>{page}</TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

/** The "Best here" line on the Bests water card and on the Waters list card. */
async function bestLines(catches: CatchEntry[]): Promise<string[]> {
  const line = (box: HTMLElement) => [...box.querySelectorAll("a.spot-card .meta")].map((each) => each.textContent ?? "").find((text) => /^(Best here|Największ)/.test(text)) ?? "";
  const bests = line(await show(catches, <BestsPage />, "/bests"));
  document.body.innerHTML = "";
  return [bests, line(await show(catches, <SpotsPage />, "/spots"))];
}

/** The same line on both cards, the dot held to the measure before it. */
const both = (text: string) => Array(2).fill(text.replaceAll(" · ", "\u00a0· "));

describe("round 132 ideas: a water's best fish by both measures", () => {
  it("names a heavier fish only weighed beside a longer one measured", async () => {
    expect(await bestLines([fish("1", "Roach", inches(10)), fish("2", "Common carp", pounds(16))])).toEqual(both("Best here: Roach, 10 in · Common carp, 16 lb"));
  });

  it("names one fish once, with both its measures, when it is both the longest and the heaviest", async () => {
    expect(await bestLines([fish("1", "Common carp", inches(30), pounds(16)), fish("2", "Roach", inches(10), pounds(1))])).toEqual(both("Best here: Common carp, 30 in · 16 lb"));
  });

  it("names the kind once when two fish of it hold the two bests, however its name was typed", async () => {
    expect(await bestLines([fish("1", "Common carp", inches(30)), fish("2", "common carp ", pounds(16))])).toEqual(both("Best here: Common carp, 30 in · 16 lb"));
  });

  it("keeps a water of fish measured one way to its best by that measure", async () => {
    expect(await bestLines([fish("1", "Common carp", pounds(16)), fish("2", "Roach", pounds(1))])).toEqual(both("Best here: Common carp, 16 lb"));
    document.body.innerHTML = "";
    expect(await bestLines([fish("1", "Common carp", inches(30)), fish("2", "Roach", inches(10))])).toEqual(both("Best here: Common carp, 30 in"));
  });

  it("names two fish in the plural in Polish, one fish in the singular", async () => {
    setLang("pl");
    const [two] = await bestLines([fish("1", "Roach", inches(10)), fish("2", "Common carp", pounds(16))]);
    expect(two).toMatch(/^Największe tutaj: .+, 25,4 cm\u00a0· .+, 7,3 kg$/);
    document.body.innerHTML = "";
    const [kind] = await bestLines([fish("1", "Common carp", inches(30)), fish("2", "Common carp", pounds(16))]);
    expect(kind).toMatch(/^Największe tutaj: .+, 76,2 cm\u00a0· 7,3 kg$/);
    document.body.innerHTML = "";
    const [one] = await bestLines([fish("1", "Common carp", inches(30), pounds(16))]);
    expect(one).toMatch(/^Największa tutaj: .+, 76,2 cm\u00a0· 7,3 kg$/);
  });
});
