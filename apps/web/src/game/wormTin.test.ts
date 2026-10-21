import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rainedYesterday } from "./logic";
import { loadTin, saveTin, WORM_TIN_DAILY, WORM_TIN_WET, wormTinKey, wormsDug } from "./wormTin";

const dom = new JSDOM("", { url: "http://localhost/" });

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: dom.window.localStorage, configurable: true });
});
afterEach(() => dom.window.localStorage.clear());

describe("the worm tin", () => {
  const days = Array.from({ length: 120 }, (_, i) => new Date(2026, 5, 1 + i, 12));
  const dry = days.filter((day) => !rainedYesterday(day));
  const wet = days.find((day) => rainedYesterday(day))!;

  it("digs more worms after a night that ended in rain", () => {
    expect(wormsDug(dry[0])).toBe(WORM_TIN_DAILY);
    expect(wormsDug(wet)).toBe(WORM_TIN_WET);
  });

  it("is topped up once a day, keeps what it holds through a day's reloads, for each angler", () => {
    const [first, second] = dry;
    expect(loadTin("ash", first).worms).toBe(WORM_TIN_DAILY);
    saveTin("ash", 1, first);
    // Spent today, a reload doesn't dig them again.
    expect(loadTin("ash", first).worms).toBe(1);
    expect(loadTin("mara", first).worms).toBe(WORM_TIN_DAILY);
    // A new day digs up to the day's count, and never takes worms away.
    expect(loadTin("ash", second).worms).toBe(WORM_TIN_DAILY);
    saveTin("ash", WORM_TIN_WET, second);
    expect(loadTin("ash", new Date(second.getTime() + 86_400_000 * 30)).worms).toBe(WORM_TIN_WET);
  });

  it("is topped up fuller after a wet night", () => {
    const before = new Date(wet.getTime() - 86_400_000);
    loadTin("ash", before);
    saveTin("ash", 0, before);
    expect(loadTin("ash", wet).worms).toBe(WORM_TIN_WET);
  });

  it("loses the worms left from an earlier day in summer's heat, judged by the season when the angler comes back", () => {
    const [first, second, third] = dry;
    loadTin("ash", first);
    saveTin("ash", WORM_TIN_WET, first);
    expect(loadTin("ash", second, "spring")).toEqual({ worms: WORM_TIN_WET, died: 0 });
    expect(loadTin("ash", third, "summer")).toEqual({ worms: WORM_TIN_DAILY, died: WORM_TIN_WET - WORM_TIN_DAILY });
    // A reload the same day keeps what the day's dig left, and a tin no fuller than the dig loses nothing that shows.
    expect(loadTin("ash", third, "summer")).toEqual({ worms: WORM_TIN_DAILY, died: 0 });
    saveTin("ash", WORM_TIN_DAILY - 1, third);
    expect(loadTin("ash", new Date(third.getTime() + 86_400_000), "summer").died).toBe(0);
    // A wet summer morning digs the tin full.
    const before = new Date(wet.getTime() - 86_400_000);
    loadTin("mara", before);
    saveTin("mara", WORM_TIN_WET, before);
    expect(loadTin("mara", wet, "summer")).toEqual({ worms: WORM_TIN_WET, died: 0 });
  });

  it("keeps a summer worm bought after midnight on a visit that began the day before, not one spent then", () => {
    const day = dry[1];
    const late = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 23, 50);
    loadTin("ash", late, "summer");
    saveTin("ash", WORM_TIN_WET, new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 5));
    expect(loadTin("ash", day, "summer")).toEqual({ worms: WORM_TIN_WET, died: 0 });
    // Spending one past midnight doesn't keep the rest fresh.
    const next = new Date(day.getTime() + 86_400_000);
    saveTin("ash", WORM_TIN_WET - 1, new Date(next.getFullYear(), next.getMonth(), next.getDate(), 0, 5));
    expect(loadTin("ash", next, "summer").worms).toBe(wormsDug(next));
  });

  it("doesn't spend the next day's worms when a visit runs past midnight, and reads a broken tin as a new one", () => {
    const late = new Date(dry[1].getFullYear(), dry[1].getMonth(), dry[1].getDate() - 1, 23, 50);
    loadTin("ash", late);
    saveTin("ash", 0, new Date(dry[1].getFullYear(), dry[1].getMonth(), dry[1].getDate(), 0, 10));
    expect(loadTin("ash", dry[1]).worms).toBe(wormsDug(dry[1]));
    dom.window.localStorage.setItem(wormTinKey("mara"), JSON.stringify({ worms: "x" }));
    expect(loadTin("mara", dry[0]).worms).toBe(WORM_TIN_DAILY);
  });
});
