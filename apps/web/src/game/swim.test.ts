import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUNDBAIT_CASTS, OVERFED_CASTS, SPOOKED_SWIM_CASTS, SWIM_MAX_CASTS, TOPUP_MAX, WARY_LANDED } from "./logic";
import { BREAD_SWIM_CASTS, loadSwim, RAIN_WASHED_CASTS, saveSwim, SWIM_COLD_GONE_MS, SWIM_COLD_PRIMED_MS, SWIM_GONE_MS, SWIM_HOT_GONE_MS, SWIM_HOT_PRIMED_MS, SWIM_PRIMED_MS, swimNow, swimTimes } from "./swim";

const swim = { spot: "reeds" as const, casts: 2, at: 0 };

describe("a groundbaited swim left for the next visit", () => {
  it("keeps its casts soon after, fishes as freshly baited once left overnight, and is gone after two days", () => {
    expect(swimNow(swim, SWIM_PRIMED_MS - 1)).toEqual({ ...swim, primedNow: false });
    expect(swimNow(swim, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, at: 0, primed: true, primedNow: true });
    // Primed once, it is not refilled again, and is gone two days after the handful went in.
    expect(swimNow({ ...swim, primed: true }, SWIM_PRIMED_MS * 2)).toEqual({ ...swim, primed: true, primedNow: false });
    expect(swimNow(swim, SWIM_GONE_MS + 1)).toBeNull();
    expect(swimNow({ ...swim, casts: 0 }, 1)).toBeNull();
    expect(swimNow(null, 1)).toBeNull();
  });

  it("follows the season the angler comes back in: summer's fish find it sooner and eat it in a day, winter's are slow but it keeps four days", () => {
    expect(swimTimes("spring")).toEqual({ primedMs: SWIM_PRIMED_MS, goneMs: SWIM_GONE_MS });
    expect(swimTimes("fall")).toEqual(swimTimes(undefined));
    expect(swimNow(swim, SWIM_HOT_PRIMED_MS, "summer")?.primedNow).toBe(true);
    expect(swimNow(swim, SWIM_HOT_PRIMED_MS, "spring")?.primedNow).toBe(false);
    expect(swimNow(swim, SWIM_HOT_GONE_MS + 1, "summer")).toBeNull();
    expect(swimNow(swim, SWIM_PRIMED_MS, "winter")?.primedNow).toBe(false);
    expect(swimNow(swim, SWIM_COLD_PRIMED_MS, "winter")?.primedNow).toBe(true);
    expect(swimNow({ ...swim, primed: true }, SWIM_GONE_MS + 1, "winter")).toEqual({ ...swim, primed: true, primedNow: false });
    expect(swimNow(swim, SWIM_COLD_GONE_MS + 1, "winter")).toBeNull();
  });

  it("primes with fewer casts when it is raining on the next visit, the rain having washed some of it away", () => {
    expect(swimNow(swim, SWIM_PRIMED_MS, undefined, "rain")).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS - RAIN_WASHED_CASTS, at: 0, primed: true, primedNow: true });
    expect(swimNow({ ...swim, bread: true }, SWIM_PRIMED_MS, undefined, "rain")?.casts).toBe(BREAD_SWIM_CASTS - RAIN_WASHED_CASTS);
    expect(swimNow(swim, SWIM_PRIMED_MS, undefined, "overcast")?.casts).toBe(GROUNDBAIT_CASTS);
    // Only as it primes: one soon after, or primed already, keeps its casts.
    expect(swimNow(swim, SWIM_PRIMED_MS - 1, undefined, "rain")).toEqual({ ...swim, primedNow: false });
    expect(swimNow({ ...swim, primed: true }, SWIM_PRIMED_MS, undefined, "rain")).toEqual({ ...swim, primed: true, primedNow: false });
  });

  it("with bread crumb in it, holds the gathered feeders longer, and a reload keeps those casts only for a swim baited with it", () => {
    const crumb = { ...swim, bread: true };
    expect(swimNow(crumb, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: BREAD_SWIM_CASTS, at: 0, primed: true, bread: true, primedNow: true });
    expect(swimNow(crumb, SWIM_PRIMED_MS - 1)).toEqual({ ...crumb, primedNow: false });
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const held = { ...crumb, casts: BREAD_SWIM_CASTS, primed: true };
    saveSwim("u", held);
    expect(loadSwim("u")).toEqual(held);
  });

  it("keeps its chopped worm through a reload and when it primes", () => {
    const wormed = { ...swim, worm: true };
    expect(swimNow(wormed, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, at: 0, primed: true, worm: true, primedNow: true });
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    saveSwim("u", wormed);
    expect(loadSwim("u")).toEqual(wormed);
  });

  it("keeps its count of big feeders landed through a reload and when it primes", () => {
    const wary = { ...swim, built: TOPUP_MAX, landedBig: WARY_LANDED };
    expect(swimNow(wary, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, at: 0, primed: true, landedBig: WARY_LANDED, primedNow: true });
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    saveSwim("u", wary);
    expect(loadSwim("u")).toEqual(wary);
    saveSwim("u", { ...wary, landedBig: WARY_LANDED + 1 });
    expect(loadSwim("u")).toEqual({ ...swim, built: TOPUP_MAX });
  });

  it("keeps a lure having ripped through it through a reload and when it primes, so the cast's hint is not told again", () => {
    const ripped = { ...swim, ripped: true };
    expect(swimNow(ripped, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, at: 0, primed: true, ripped: true, primedNow: true });
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    saveSwim("u", ripped);
    expect(loadSwim("u")).toEqual(ripped);
  });

  it("keeps a topped-up swim's casts, top-ups and scattered feeders through a reload, its full fish hungry again, and drops the top-ups and scatter when it primes", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const built = { ...swim, casts: SWIM_MAX_CASTS, built: TOPUP_MAX };
    saveSwim("u", { ...built, full: OVERFED_CASTS });
    expect(loadSwim("u")).toEqual(built);
    saveSwim("u", { ...built, built: TOPUP_MAX + 1 });
    expect(loadSwim("u")).toEqual({ ...swim, casts: SWIM_MAX_CASTS });
    const scattered = { ...swim, casts: SWIM_MAX_CASTS, spooked: SPOOKED_SWIM_CASTS };
    saveSwim("u", scattered);
    expect(loadSwim("u")).toEqual(scattered);
    saveSwim("u", { ...scattered, spooked: SPOOKED_SWIM_CASTS + 1 });
    expect(loadSwim("u")).toEqual({ ...swim, casts: SWIM_MAX_CASTS });
    expect(swimNow(scattered, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, at: 0, primed: true, primedNow: true });
    saveSwim("u", { ...built, casts: SWIM_MAX_CASTS + 1 });
    expect(loadSwim("u")).toBeNull();
    expect(swimNow(built, SWIM_PRIMED_MS)).toEqual({ spot: "reeds", casts: GROUNDBAIT_CASTS, at: 0, primed: true, primedNow: true });
  });
});

afterEach(() => vi.unstubAllGlobals());
