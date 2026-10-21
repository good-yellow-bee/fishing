import { afterEach, describe, expect, it, vi } from "vitest";
import { baitDay, loadPrebait, PREBAIT_DAYS, prebaitKey, savePrebait } from "./prebait";

const day = (d: number) => new Date(2026, 9, d, 12);

describe("prebaiting a bank days running", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("counts the days running at one bank, once a day, and makes it a regular feeding spot on day three", () => {
    const first = baitDay(null, "reeds", day(1));
    expect(first).toEqual({ next: { spot: "reeds", day: "2026-10-01", days: 1 }, newDay: true, regular: false });
    expect(baitDay(first.next, "reeds", day(1))).toEqual({ next: first.next, newDay: false, regular: false });
    const second = baitDay(first.next, "reeds", day(2));
    expect(second.next.days).toBe(2);
    expect(second.regular).toBe(false);
    const third = baitDay(second.next, "reeds", day(3));
    expect(third).toEqual({ next: { spot: "reeds", day: "2026-10-03", days: PREBAIT_DAYS }, newDay: true, regular: true });
    // Only the day's first handful there comes regular.
    expect(baitDay(third.next, "reeds", day(3)).regular).toBe(false);
    expect(baitDay(third.next, "reeds", day(4))).toMatchObject({ next: { days: PREBAIT_DAYS + 1 }, regular: true });
  });

  it("starts again after a missed day, and at another bank", () => {
    const run = { spot: "reeds" as const, day: "2026-10-02", days: 2 };
    expect(baitDay(run, "reeds", day(4))).toEqual({ next: { spot: "reeds", day: "2026-10-04", days: 1 }, newDay: true, regular: false });
    expect(baitDay(run, "dock", day(3))).toEqual({ next: { spot: "dock", day: "2026-10-03", days: 1 }, newDay: true, regular: false });
    expect(baitDay(run, "dock", day(2)).next).toEqual({ spot: "dock", day: "2026-10-02", days: 1 });
  });

  it("keeps the run per angler, and reads nothing from a broken one", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    const run = { spot: "reeds" as const, day: "2026-10-02", days: 2 };
    savePrebait("a", run);
    expect(loadPrebait("a")).toEqual(run);
    expect(loadPrebait("b")).toBeNull();
    for (const broken of ['{"spot":"moon","day":"2026-10-02","days":2}', '{"spot":"reeds","days":2}', '{"spot":"reeds","day":"2026-10-02","days":0}', "not json"]) {
      kept.set(prebaitKey("a"), broken);
      expect(loadPrebait("a")).toBeNull();
    }
  });
});
