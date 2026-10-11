import { describe, expect, it } from "vitest";
import { lakeHour, nextLakeHourChange } from "./hour.ts";

const at = (h: number, m = 0, day = 11) => new Date(2026, 9, day, h, m);

describe("next lake hour change", () => {
  it("finds the next turnover the same day, and dawn tomorrow after dark", () => {
    expect(nextLakeHourChange(at(6, 30))).toEqual(at(8));
    expect(nextLakeHourChange(at(16, 59))).toEqual(at(17));
    expect(nextLakeHourChange(at(17))).toEqual(at(21));
    expect(nextLakeHourChange(at(23, 10))).toEqual(at(5, 0, 12));
    expect(nextLakeHourChange(at(2))).toEqual(at(5));
  });

  it("always lands where lakeHour reads a new hour", () => {
    for (let h = 0; h < 24; h += 1) {
      const now = at(h, 17);
      const turn = nextLakeHourChange(now);
      expect(lakeHour(turn)).not.toBe(lakeHour(new Date(turn.getTime() - 1)));
      expect(lakeHour(new Date(turn.getTime() - 1))).toBe(lakeHour(now));
    }
  });
});
