// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SKY_LABELS, weatherForDay } from "@stillwater/shared";
import { ForecastBoard } from "./ForecastBoard";

afterEach(() => vi.unstubAllGlobals());

describe("ForecastBoard", () => {
  it("chalks today, tomorrow and the weekday after, with each day's sky", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    const root = createRoot(host);
    // Sunday 11 October 2026.
    act(() => root.render(<ForecastBoard now={new Date(2026, 9, 11, 9)} />));
    const days = [...host.querySelectorAll("li")];
    expect(days.map((day) => day.querySelector("strong")?.textContent)).toEqual(["Today", "Tomorrow", "Tuesday"]);
    expect(days[2]?.querySelector(".forecast-sky")?.textContent).toBe(SKY_LABELS[weatherForDay(new Date(2026, 9, 13, 12))]);
    act(() => root.unmount());
  });
});
