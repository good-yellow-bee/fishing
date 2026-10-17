import { describe, expect, it } from "vitest";
import { stepDay } from "./DayCalendar";

describe("stepDay", () => {
  const days = ["2026-05-02", "2026-05-03", "2026-05-11", "2026-06-20"];

  it("walks the days that open something, and stops at the ends", () => {
    expect(stepDay(days, "2026-05-03", "ArrowRight")).toBe("2026-05-11");
    expect(stepDay(days, "2026-05-03", "ArrowLeft")).toBe("2026-05-02");
    expect(stepDay(days, "2026-05-02", "ArrowLeft")).toBe("2026-05-02");
    expect(stepDay(days, "2026-06-20", "ArrowRight")).toBe("2026-06-20");
    expect(stepDay(days, "2026-05-11", "Home")).toBe("2026-05-02");
    expect(stepDay(days, "2026-05-02", "End")).toBe("2026-06-20");
  });

  it("goes a week or more up and down, across months", () => {
    expect(stepDay(days, "2026-05-02", "ArrowDown")).toBe("2026-05-11");
    expect(stepDay(days, "2026-05-11", "ArrowDown")).toBe("2026-06-20");
    expect(stepDay(days, "2026-05-11", "ArrowUp")).toBe("2026-05-03");
    expect(stepDay(days, "2026-05-03", "ArrowUp")).toBe("2026-05-02");
  });

  it("leaves other keys alone", () => {
    expect(stepDay(days, "2026-05-03", "Enter")).toBeNull();
  });
});
