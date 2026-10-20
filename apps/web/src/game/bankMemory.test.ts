import { describe, expect, it } from "vitest";
import { countAtBank, rollBankMemory, waryFromYesterday, YESTERDAY_HARD_FISH, YESTERDAY_WARY_CASTS, type BankMemory } from "./bankMemory";

const at = (day: number) => new Date(2026, 9, day, 12);

describe("the banks' memory of yesterday", () => {
  it("moves the stored day to yesterday on the next day, and forgets it after", () => {
    const monday = countAtBank(rollBankMemory(null, at(19)), "dock", "landed");
    expect(rollBankMemory(monday, at(20)).yesterday?.landed.dock).toBe(1);
    expect(rollBankMemory(monday, at(20)).today.landed).toEqual({});
    expect(rollBankMemory(monday, at(21)).yesterday).toBeNull();
    expect(rollBankMemory(monday, at(19)).today.landed.dock).toBe(1);
    expect(rollBankMemory({ junk: true }, at(19)).yesterday).toBeNull();
  });

  it("keeps a bank fished hard yesterday wary for today's first casts there only", () => {
    let memory: BankMemory = rollBankMemory(null, at(19));
    for (let i = 0; i < YESTERDAY_HARD_FISH; i++) memory = countAtBank(memory, "dock", "landed");
    memory = countAtBank(memory, "reeds", "landed");
    memory = rollBankMemory(memory, at(20));
    expect(waryFromYesterday(memory, "reeds")).toBe(false);
    for (let i = 0; i < YESTERDAY_WARY_CASTS; i++) {
      expect(waryFromYesterday(memory, "dock")).toBe(true);
      memory = countAtBank(memory, "dock", "casts");
    }
    expect(waryFromYesterday(memory, "dock")).toBe(false);
  });
});
