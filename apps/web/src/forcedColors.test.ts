import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${import.meta.dirname}/${path}`, "utf8");
const forced = (css: string) => /@media \(forced-colors: active\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";

// A high contrast theme drops background colours, so anything drawn only with a background vanishes.
describe("high contrast themes", () => {
  it("draws the cast and fight bars and the strike timer in the theme's colours", () => {
    const block = forced(read("index.css"));
    expect(block).toContain("forced-color-adjust: none;");
    for (const part of [".bar .zone", ".bar .marker", ".bar .fill", ".bar .last-cast", ".fight-bar .danger-zone", ".strike-cue .cue-bar b"]) expect(block).toContain(part);
    expect(block).toContain(".power-meter .bar");
  });

  it("draws the days calendar and the tally bars in the theme's colours", () => {
    const block = forced(read("field/field.css"));
    expect(block).toContain("forced-color-adjust: none;");
    for (const part of [".day-grid .day-level-3", ".day-grid .day-blank", ".day-grid .day-planned", ".tally-bar > span"]) expect(block).toContain(part);
  });
});
