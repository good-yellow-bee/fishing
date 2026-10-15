import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { waterTips } from "./waterTips";

describe("water tips", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));

  it("stays quiet on a water with only a fish or two", () => {
    expect(waterTips(book.catches.slice(0, 2))).toBeNull();
  });

  it("names the best lures and the busiest time of day", () => {
    const base = book.catches[0]!;
    const fish = (id: string, lure: string, hour: number) => ({ ...base, id, lure, caughtAt: `2026-10-01T${String(hour).padStart(2, "0")}:00:00` });
    const tips = waterTips([fish("a", "Spinnerbait", 6), fish("b", "spinnerbait", 7), fish("c", "Jig", 19), fish("d", "Spoon", 5), fish("e", "Tube", 12)])!;
    expect(tips.lures[0]).toMatchObject({ count: 2 });
    expect(tips.lures).toHaveLength(3);
    expect(tips.time).toMatchObject({ id: "dawn", count: 3 });
  });

  it("breaks a tie in time of day toward the earlier band", () => {
    const at = (iso: string, id: string) => ({ ...book.catches[0]!, id, caughtAt: iso });
    const tips = waterTips([at("2026-10-01T06:00:00", "a"), at("2026-10-01T19:00:00", "b"), at("2026-10-01T12:00:00", "c")])!;
    expect(tips.time?.id).toBe("dawn");
  });
});
