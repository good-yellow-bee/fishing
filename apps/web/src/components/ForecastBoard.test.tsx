// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { forecast, hotBankForDay, moonName, moonPhase, SKY_LABELS, SPOT_LABELS, skyTurnForDay, weatherForDay } from "@stillwater/shared";
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

  it("chalks who fights hard on a rainy day, and nothing about it on a dry one", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    const root = createRoot(host);
    const days = Array.from({ length: 120 }, (_, n) => new Date(2026, 0, 1 + n, 9));
    const wet = (day: Date) => forecast(day)[0]!.sky === "rain" || forecast(day)[0]!.turn?.to === "rain";
    act(() => root.render(<ForecastBoard now={days.find(wet)!} />));
    expect([...host.querySelectorAll("li:first-child .forecast-tip")].map((tip) => tip.textContent)).toContain(
      "Catfish and burbot hunt by scent in the murk and fight harder.",
    );
    act(() => root.render(<ForecastBoard now={days.find((day) => !wet(day))!} />));
    expect([...host.querySelectorAll("li:first-child .forecast-tip")].map((tip) => tip.textContent)).not.toContain(
      "Catfish and burbot hunt by scent in the murk and fight harder.",
    );
    act(() => root.unmount());
  });

  it("chalks the hour before the rain on a day that turns wet", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    const root = createRoot(host);
    const days = Array.from({ length: 365 }, (_, n) => new Date(2026, 0, 1 + n, 9));
    const wet = days.find((day) => skyTurnForDay(day)?.to === "rain")!;
    act(() => root.render(<ForecastBoard now={wet} />));
    expect(host.querySelector("li:first-child")?.textContent).toContain(`The fish feed hard in the hour before the rain, from ${skyTurnForDay(wet)!.hour - 1}:00.`);
    act(() => root.render(<ForecastBoard now={days.find((day) => !skyTurnForDay(day))!} />));
    expect(host.querySelector("li:first-child")?.textContent).not.toContain("before the rain");
    act(() => root.unmount());
  });

  it("chalks the hour the fog burns off on a foggy morning", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    const root = createRoot(host);
    const days = Array.from({ length: 365 }, (_, n) => new Date(2026, 0, 1 + n, 8));
    const foggy = days.find((day) => skyTurnForDay(day)?.to === "clear")!;
    act(() => root.render(<ForecastBoard now={foggy} />));
    expect(host.querySelector("li:first-child")?.textContent).toContain(`The fish move up to feed as the fog burns off, from ${skyTurnForDay(foggy)!.hour}:00.`);
    act(() => root.render(<ForecastBoard now={days.find((day) => !skyTurnForDay(day))!} />));
    expect(host.querySelector("li:first-child")?.textContent).not.toContain("fog burns off");
    act(() => root.unmount());
  });

  it("chalks what a full or new moon does to the night's bite", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    const root = createRoot(host);
    const days = Array.from({ length: 60 }, (_, n) => new Date(2026, 9, 1 + n, 9));
    const night = (day: Date) => moonName(moonPhase(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 22)));
    act(() => root.render(<ForecastBoard now={days.find((day) => night(day) === "full")!} />));
    expect(host.querySelector("li:first-child .forecast-moon")?.textContent).toBe("Full moon");
    expect(host.querySelector("li:first-child")?.textContent).toContain("On a clear night a spinner or spoon flashes under it.");
    act(() => root.render(<ForecastBoard now={days.find((day) => night(day) === "new")!} />));
    expect(host.querySelector("li:first-child .forecast-moon")?.textContent).toBe("New moon");
    expect(host.querySelector("li:first-child")?.textContent).toContain("Too dark to see: bites come slower after dark.");
    act(() => root.unmount());
  });
});
