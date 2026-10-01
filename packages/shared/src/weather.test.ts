import { describe, expect, it } from "vitest";
import { catchesForTrip, isLogbook, parseCatchDraft, sampleLogbook, type CatchDraft } from "./logbook.ts";
import { formatWeather, parseWeatherDraft, prepareStoredLogbook, sampleCatchWeather } from "./weather.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);

function draft(overrides: Partial<CatchDraft> = {}): CatchDraft {
  return {
    species: "Yellow perch",
    measureKind: "length",
    amount: "11",
    lure: "Nightcrawler",
    spotId: "spot-cedar",
    tripId: "",
    caughtAt: "2026-09-28T07:15",
    note: "",
    sky: "fog",
    wind: "calm",
    waterTemp: "54",
    ...overrides,
  };
}

describe("catch weather", () => {
  const book = sampleLogbook(now);

  it("fills sky, wind, and water temperature on every sample catch", () => {
    expect(book.catches.length).toBeGreaterThan(0);
    for (const entry of book.catches) {
      expect(entry.weather).toEqual(sampleCatchWeather(entry.id));
    }
  });

  it("keeps one reading for each sample outing", () => {
    for (const tripId of ["trip-mill", "trip-cedar-eve", "trip-quarry", "trip-duck", "trip-oxbow"]) {
      const rows = catchesForTrip(book, tripId);
      expect(rows.length).toBeGreaterThan(1);
      const first = rows[0]?.weather;
      expect(first).toBeTruthy();
      expect(rows.every((entry) => formatWeather(entry.weather!) === formatWeather(first!))).toBe(true);
    }
    expect(formatWeather(sampleCatchWeather("catch-pike-mepps"))).toBe("Overcast · Light west · 58°F");
    expect(formatWeather(sampleCatchWeather("catch-gill"))).toBe("Clear · Calm · 68°F");
    expect(formatWeather(sampleCatchWeather("catch-brook-caddis"))).toBe("Overcast · Light east · 48°F");
  });

  it("accepts a catch only with sky, wind, and a plausible water temperature", () => {
    const saved = parseCatchDraft(draft(), book);
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.value.weather).toEqual({ sky: "fog", wind: "calm", waterTempF: 54 });
    }
    expect(parseWeatherDraft({ sky: "", wind: "calm", waterTemp: "54" })).toMatchObject({ ok: false, field: "sky" });
    expect(parseWeatherDraft({ sky: "rain", wind: "nope", waterTemp: "54" })).toMatchObject({ ok: false, field: "wind" });
    expect(parseCatchDraft(draft({ waterTemp: "hot" }), book)).toMatchObject({ ok: false, field: "waterTemp" });
    expect(parseCatchDraft(draft({ waterTemp: "31" }), book)).toMatchObject({ ok: false, field: "waterTemp" });
    expect(parseCatchDraft(draft({ waterTemp: "90.5" }), book)).toMatchObject({ ok: false, field: "waterTemp" });
  });

  it("backfills sample weather on a book saved before weather existed", () => {
    const pike = book.catches.find((entry) => entry.id === "catch-pike-mepps");
    expect(pike).toBeTruthy();
    const { weather: _weather, ...without } = pike!;
    const stored = prepareStoredLogbook({
      spots: book.spots,
      trips: book.trips,
      catches: [without, { ...book.catches[0], id: "catch-mine", weather: { sky: "rain", wind: "strong", waterTempF: 49 } }],
    });
    const catches = (stored as { catches: Array<{ id: string; weather: unknown }> }).catches;
    expect(isLogbook(stored)).toBe(true);
    expect(catches[0]?.weather).toEqual(sampleCatchWeather("catch-pike-mepps"));
    expect(catches[1]?.weather).toEqual({ sky: "rain", wind: "strong", waterTempF: 49 });
  });
});
