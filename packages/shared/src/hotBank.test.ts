import { describe, expect, it } from "vitest";
import { HOT_BANKS, hotBankForDay } from "./hotBank.ts";

describe("hotBankForDay", () => {
  it("names one bank per local day, the same all day", () => {
    const morning = hotBankForDay(new Date(2026, 9, 14, 6));
    expect(HOT_BANKS).toContain(morning);
    expect(hotBankForDay(new Date(2026, 9, 14, 23, 59))).toBe(morning);
  });

  it("never keeps the same bank two days running, and visits every bank over a season", () => {
    const seen = new Set<string>();
    let previous = hotBankForDay(new Date(2026, 0, 1));
    for (let day = 1; day < 90; day += 1) {
      const bank = hotBankForDay(new Date(2026, 0, 1 + day));
      expect(bank).not.toBe(previous);
      seen.add(bank);
      previous = bank;
    }
    expect(seen.size).toBe(HOT_BANKS.length);
  });
});
