import { describe, expect, it } from "vitest";
import { TADPOLE_REACH, amongTadpoles } from "./tadpoleShallows";
import { TADPOLE_SCHOOLS } from "./scene/tadpoleSchools";

describe("amongTadpoles", () => {
  const school = TADPOLE_SCHOOLS[0]!;

  it("lands among a school in spring by daylight, as far as it wanders", () => {
    for (const hour of ["dawn", "day", "dusk"] as const) expect(amongTadpoles("spring", hour, school.x, school.z)).toBe(true);
    expect(amongTadpoles("spring", "day", school.x + TADPOLE_REACH * 0.95, school.z)).toBe(true);
    expect(amongTadpoles("spring", "day", school.x, school.z - 4)).toBe(false);
  });

  it("finds no tadpoles at night, after spring, or without a season", () => {
    expect(amongTadpoles("spring", "night", school.x, school.z)).toBe(false);
    expect(amongTadpoles("summer", "day", school.x, school.z)).toBe(false);
    expect(amongTadpoles(undefined, "day", school.x, school.z)).toBe(false);
  });
});
