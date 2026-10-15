import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetWarmed, lakeWorthWarming, warmLake } from "./warmLake";

describe("warm the lake from the field log", () => {
  beforeEach(() => forgetWarmed());

  it("loads the lake's code once, when the browser is idle", () => {
    const load = vi.fn(async () => undefined);
    let idle: (() => void) | undefined;
    const host = { requestIdleCallback: (run: () => void) => ((idle = run), 1), setTimeout: vi.fn() };
    expect(warmLake(load, host, undefined)).toBe(true);
    expect(load).not.toHaveBeenCalled();
    idle!();
    expect(load).toHaveBeenCalledTimes(1);
    expect(warmLake(load, host, undefined)).toBe(false);
  });

  it("falls back to a timer without idle callbacks", () => {
    const setTimeout = vi.fn();
    expect(warmLake(vi.fn(async () => undefined), { setTimeout }, undefined)).toBe(true);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
  });

  it("leaves a data saver or a slow link alone", () => {
    expect(lakeWorthWarming({ saveData: true })).toBe(false);
    expect(lakeWorthWarming({ effectiveType: "2g" })).toBe(false);
    expect(lakeWorthWarming({ effectiveType: "4g" })).toBe(true);
    expect(warmLake(vi.fn(), { setTimeout: vi.fn() }, { saveData: true })).toBe(false);
  });
});
