import { describe, expect, it } from "vitest";
import { datedName } from "./download";

describe("datedName", () => {
  it("puts the day before the extension", () => {
    expect(datedName("stillwater-field-log.json", "2026-10-16")).toBe("stillwater-field-log-2026-10-16.json");
    expect(datedName("notes", "2026-10-16")).toBe("notes-2026-10-16");
  });
});
