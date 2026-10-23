import { describe, expect, it } from "vitest";
import { cleanNickname, lakeNickname, LAKE_WORDS, NICKNAME_MAX } from "./nickname.ts";

describe("nicknames", () => {
  it("makes a lake word and four digits", () => {
    expect(lakeNickname(() => 0)).toBe(`${LAKE_WORDS[0]} 1000`);
    expect(lakeNickname(() => 0.9999)).toBe(`${LAKE_WORDS.at(-1)} 9999`);
    expect(lakeNickname(() => 0, (word) => word.toUpperCase())).toBe("HERON 1000");
  });

  it("trims a typed nickname and cuts it to 24 characters without splitting an emoji", () => {
    expect(cleanNickname("  Ana  ")).toBe("Ana");
    expect(cleanNickname("   ")).toBe("");
    expect(cleanNickname(undefined)).toBe("");
    expect(cleanNickname("a".repeat(30))).toHaveLength(NICKNAME_MAX);
    expect([...cleanNickname("🐟".repeat(30))]).toHaveLength(NICKNAME_MAX);
  });
});
