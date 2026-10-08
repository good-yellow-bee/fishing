import { describe, expect, it } from "vitest";
import { ambientProfile } from "./fx.ts";

describe("ambient conditions", () => {
  it("switches wildlife by hour and rain ambience by sky", () => {
    expect(ambientProfile("day", "clear")).toMatchObject({ wildlife: "birds", rain: false });
    expect(ambientProfile("night", "fog")).toMatchObject({ wildlife: "crickets", rain: false });
    expect(ambientProfile("dusk", "rain")).toMatchObject({ wildlife: "birds", rain: true });
  });

  it("uses a restrained three-note motif for each time of day", () => {
    expect(ambientProfile("day", "clear").melody).toHaveLength(3);
    expect(ambientProfile("night", "rain").melody.every((note) => note > 0)).toBe(true);
  });
});
