import { describe, expect, it } from "vitest";
import { parseKeptForm } from "./keptForm";

const now = new Date("2026-10-16T12:00:00Z");
const raw = JSON.stringify({
  "trip:a": { fields: { title: "Dawn patrol, again" }, base: "trip a", savedAt: "2026-10-16T11:00:00Z" },
  "spot:b": { fields: { name: "Cedar" }, base: "spot b", savedAt: "2026-10-14T11:00:00Z" },
});

describe("parseKeptForm", () => {
  it("offers a form's changes while its record reads as it did", () => {
    expect(parseKeptForm(raw, "trip:a", "trip a", now)?.fields.title).toBe("Dawn patrol, again");
  });

  it("lets go of stale ones: another record, a changed record, or a day old", () => {
    expect(parseKeptForm(raw, "trip:z", "trip a", now)).toBeNull();
    expect(parseKeptForm(raw, "trip:a", "changed", now)).toBeNull();
    expect(parseKeptForm(raw, "spot:b", "spot b", now)).toBeNull();
    expect(parseKeptForm("not json", "trip:a", "trip a", now)).toBeNull();
  });
});
