import { afterEach, describe, expect, it, vi } from "vitest";
import { setLang, t, tn } from "../i18n";
import { tripWhen } from "./format";

afterEach(() => {
  vi.useRealTimers();
  setLang("en");
});

describe("round 94 ideas: last evening's outing reads Last night in the small hours", () => {
  it("until four, then by its day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 0, 30));
    expect(tripWhen("2026-10-19", "2026-10-20", "2026-10-21")).toBe("Last night");
    expect(tripWhen("2026-10-20", "2026-10-20", "2026-10-21")).toBe("Today");
    setLang("pl");
    expect(tripWhen("2026-10-19", "2026-10-20", "2026-10-21")).toBe("Zeszłej nocy");
    vi.setSystemTime(new Date(2026, 9, 20, 9));
    setLang("en");
    expect(tripWhen("2026-10-19", "2026-10-20", "2026-10-21")).not.toBe("Last night");
  });
});

describe("round 94 ideas: words in Polish", () => {
  it("names the quick searches and missed strikes", () => {
    setLang("pl");
    expect(t("no fish|search word")).toBe("bez ryb");
    expect(t("night|search word")).toBe("noc");
    expect(tn(5, "{n} missed", "{n} missed")).toBe("5 pustych brań");
    expect(t("+ All {n}", { n: 3 })).toBe("+ Wszystkie (3)");
  });
});
