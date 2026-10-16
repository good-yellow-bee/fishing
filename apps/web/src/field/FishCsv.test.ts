import { describe, expect, it } from "vitest";
import { csvName } from "./FishCsv";

describe("spreadsheet name", () => {
  it("names the file after the outing, water or kind", () => {
    expect(csvName("Cedar Bend")).toBe("stillwater-cedar-bend.csv");
    expect(csvName("2026-10-14 Below the mill")).toBe("stillwater-2026-10-14-below-the-mill.csv");
    expect(csvName("Jezioro Żółte")).toBe("stillwater-jezioro-zolte.csv");
    expect(csvName("—")).toBe("stillwater-catches.csv");
  });
});
