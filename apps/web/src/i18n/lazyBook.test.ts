import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { loadPolish, polishBook } from ".";

describe("the Polish book", () => {
  it("is only imported lazily outside tests, so English players never download it", () => {
    // Every non-test file naming the book either imports its type or loads it with import().
    const hits = execFileSync("grep", ["-rnE", `from "(\\./|\\.\\./)+(i18n/)?pl"|import\\("\\./pl"\\)`, `${import.meta.dirname}/..`], { encoding: "utf8" })
      .split("\n")
      .filter((line) => line && !/\.test\.tsx?:/.test(line) && !/testSetup\.ts:/.test(line) && !/\/i18n\/pl\//.test(line));
    expect(hits.length).toBeGreaterThan(0);
    for (const line of hits) expect(line).toMatch(/import type \{ PlBook \}|import\("\.\/pl"\)/);
  });

  it("loads once and fills the book", async () => {
    expect(loadPolish()).toBe(loadPolish());
    await loadPolish();
    expect(polishBook()["Cast again"]).toBeTypeOf("string");
  });
});
