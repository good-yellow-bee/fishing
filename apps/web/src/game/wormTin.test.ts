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
    expect(loadTin("ash", first)).toBe(WORM_TIN_DAILY);
    saveTin("ash", 1, first);
    // Spent today, a reload doesn't dig them again.
    expect(loadTin("ash", first)).toBe(1);
    expect(loadTin("mara", first)).toBe(WORM_TIN_DAILY);
    // A new day digs up to the day's count, and never takes worms away.
    expect(loadTin("ash", second)).toBe(WORM_TIN_DAILY);
    saveTin("ash", WORM_TIN_WET, second);
    expect(loadTin("ash", new Date(second.getTime() + 86_400_000 * 30))).toBe(WORM_TIN_WET);
  });

  it("is topped up fuller after a wet night", () => {
    const before = new Date(wet.getTime() - 86_400_000);
    loadTin("ash", before);
    saveTin("ash", 0, before);
    expect(loadTin("ash", wet)).toBe(WORM_TIN_WET);
  });

  it("doesn't spend the next day's worms when a visit runs past midnight, and reads a broken tin as a new one", () => {
    const late = new Date(dry[1].getFullYear(), dry[1].getMonth(), dry[1].getDate() - 1, 23, 50);
    loadTin("ash", late);
    saveTin("ash", 0, new Date(dry[1].getFullYear(), dry[1].getMonth(), dry[1].getDate(), 0, 10));
    expect(loadTin("ash", dry[1])).toBe(wormsDug(dry[1]));
    dom.window.localStorage.setItem(wormTinKey("mara"), JSON.stringify({ worms: "x" }));
    expect(loadTin("mara", dry[0])).toBe(WORM_TIN_DAILY);
  });
});
