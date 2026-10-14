// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hotBankForDay, SKY_LABELS, SPOT_LABELS, skyTurnForDay, weatherForDay } from "@stillwater/shared";
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
    expect(days.map((day) => day.querySelector(".forecast-bank")?.textContent)).toEqual(
      [11, 12, 13].map((date) => `Biting best at the ${SPOT_LABELS[hotBankForDay(new Date(2026, 9, date))]}`),
    );
    act(() => root.unmount());
  });

  it("chalks the hour a day's sky turns, and nothing on a settled day", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    const root = createRoot(host);
    const turning = new Date(2026, 9, 15, 9);
    const turn = skyTurnForDay(turning)!;
    act(() => root.render(<ForecastBoard now={turning} />));
    expect(host.querySelector("li .forecast-turn")?.textContent).toBe(`Turns ${SKY_LABELS[turn.to].toLowerCase()} around ${turn.hour}:00`);
    const settled = Array.from({ length: 30 }, (_, n) => new Date(2026, 9, 1 + n, 9)).find((day) => !skyTurnForDay(day))!;
    act(() => root.render(<ForecastBoard now={settled} />));
    expect(host.querySelector("li:first-child .forecast-turn")).toBeNull();
    act(() => root.unmount());
  });
});
