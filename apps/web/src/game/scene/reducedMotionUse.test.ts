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

  it("holds falling leaves, petals, rain and snow at one moment under it", () => {
    for (const name of ["FallingLeaves.tsx", "LakeRain.tsx", "LakeSnow.tsx"]) {
      const text = scene.find((file) => file.name === name)?.text ?? "";
      expect(text, name).toContain("useReducedMotion()");
      expect(text, name).toMatch(/still \? STILL_TIME : /);
    }
  });

  it("holds the terns over the fish patch and the bank's squirrels at one moment under it", () => {
    const terns = scene.find((file) => file.name === "Terns.tsx")?.text ?? "";
    expect(terns).toContain("useReducedMotion()");
    expect(terns).toMatch(/still \? TERN_STILL_TIME : clock\.elapsedTime/);
    const squirrels = scene.find((file) => file.name === "Squirrels.tsx")?.text ?? "";
    expect(squirrels).toContain("useReducedMotion()");
    expect(squirrels).toMatch(/still \? STILL_TIME : clock\.elapsedTime/);
  });
});
