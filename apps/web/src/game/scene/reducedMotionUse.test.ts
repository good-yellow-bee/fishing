import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scene = readdirSync(import.meta.dirname)
  .filter((name) => name.endsWith(".tsx") && !name.includes(".test."))
  .map((name) => ({ name, text: readFileSync(`${import.meta.dirname}/${name}`, "utf8") }));

describe("reduce motion on the lake", () => {
  it("follows the phone's or computer's own setting, not only the game's, in every scene part", () => {
    // settings.reduceMotion alone misses the system setting: useReducedMotion() reads both.
    const missed = scene.filter(({ text }) => /settings\.reduceMotion/.test(text)).map(({ name }) => name);
    expect(missed).toEqual([]);
  });

  it("keeps the storm's flash and the shooting stars still under it", () => {
    for (const name of ["Lightning.tsx", "Stars.tsx"]) {
      expect(scene.find((file) => file.name === name)?.text).toContain("useReducedMotion()");
    }
  });
});
