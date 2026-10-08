import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { catchesForTrip, isLogbook, parseCatchDraft, sampleLogbook, type CatchDraft } from "./logbook.ts";
import { fishById } from "./fish.ts";
import { lakeHour } from "./hour.ts";
import {
  biteWeatherMul,
  DAILY_SKIES,
  dailyConditions,
  formatWeather,
  isWeather,
  parseWeatherDraft,
  prepareStoredLogbook,
  sampleCatchWeather,
  SKIES,
  weatherForDay,
  weatherFromSearch,
} from "./weather.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);

/** CI runs in UTC, where a UTC day and a local day agree; New York tells them apart. */
function inNewYork() {
  let zone: string | undefined;
  beforeAll(() => {
    zone = process.env.TZ;
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });
}

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

describe("daily lake weather", () => {
  inNewYork();
  const days = Array.from({ length: 365 }, (_, day) => new Date(2026, 0, 1 + day, 12));
  const year = days.map((day) => weatherForDay(day));
  const share = (hits: number, total: number) => hits / total;

  it("holds one sky for the whole local day, on the same clock as the lake hour", () => {
    for (const day of days) {
      const dawn = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 30);
      const night = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 30);
      expect(weatherForDay(night), day.toDateString()).toBe(weatherForDay(dawn));
      expect(lakeHour(dawn)).toBe("night");
    }
  });

  it("spreads a year over every daily sky without a fixed rotation", () => {
    expect(year.every((sky) => (DAILY_SKIES as readonly string[]).includes(sky))).toBe(true);
    for (const sky of DAILY_SKIES) {
      const count = year.filter((one) => one === sky).length;
      expect(share(count, year.length), sky).toBeGreaterThan(0.15);
      expect(share(count, year.length), sky).toBeLessThan(0.35);
    }
    const repeats = year.slice(1).filter((sky, i) => sky === year[i]).length;
    expect(share(repeats, year.length - 1)).toBeGreaterThan(0.15);
    expect(share(repeats, year.length - 1)).toBeLessThan(0.35);
    const fourDaysOn = year.slice(4).filter((sky, i) => sky === year[i]).length;
    expect(share(fourDaysOn, year.length - 4)).toBeGreaterThan(0.15);
    expect(share(fourDaysOn, year.length - 4)).toBeLessThan(0.35);
  });

  it("takes a ?sky= preview override for the four daily skies only", () => {
    expect(weatherFromSearch("?sky=rain")).toBe("rain");
    expect(weatherFromSearch("hour=night&sky=fog")).toBe("fog");
    expect(weatherFromSearch("?sky=partly-cloudy")).toBeNull();
    expect(weatherFromSearch("?sky=storm")).toBeNull();
    expect(weatherFromSearch("?weather=rain")).toBeNull();
    expect(weatherFromSearch("")).toBeNull();
  });

  it("brings pike and muskie up in rain, trout and bass under cloud, catfish and burbot in fog", () => {
    const mul = (id: string, sky: (typeof SKIES)[number]) => biteWeatherMul(fishById(id)!, sky);
    for (const id of ["pike", "tiger-muskie"]) expect(mul(id, "rain"), id).toBeGreaterThan(mul(id, "clear"));
    for (const id of ["brook-trout", "rainbow-trout", "smallmouth-bass"]) {
      expect(mul(id, "overcast"), id).toBeGreaterThan(mul(id, "clear"));
    }
    for (const id of ["catfish", "burbot"]) expect(mul(id, "fog"), id).toBeGreaterThan(mul(id, "clear"));
    expect(mul("smallmouth-bass", "overcast")).toBeGreaterThan(mul("carp", "overcast"));
    expect(mul("perch", "partly-cloudy")).toBe(1);
  });
});

describe("daily catch conditions", () => {
  inNewYork();
  const days = Array.from({ length: 365 }, (_, day) => new Date(2026, 0, 1 + day, 12));

  it("keeps the same wind and water all day and records the sky it was given", () => {
    const early = dailyConditions(new Date(2026, 9, 8, 0, 30), "rain");
    expect(dailyConditions(new Date(2026, 9, 8, 23, 30), "rain")).toEqual(early);
    expect(early.sky).toBe("rain");
  });

  it("stays a reading the field log accepts, with wind that suits the sky", () => {
    const winds = new Set<string>();
    for (const day of days) {
      for (const sky of SKIES) {
        const reading = dailyConditions(day, sky);
        expect(isWeather(reading)).toBe(true);
        expect(parseWeatherDraft({ sky, wind: reading.wind, waterTemp: String(reading.waterTempF) }).ok).toBe(true);
        if (sky === "fog") expect(["breezy", "strong"]).not.toContain(reading.wind);
        if (sky === "rain") expect(reading.wind).not.toBe("calm");
        if (sky === "clear") winds.add(reading.wind);
      }
    }
    expect(winds.size).toBeGreaterThan(3);
  });

  it("warms the water through summer and cools it into winter", () => {
    const water = (month: number) => dailyConditions(new Date(2026, month, 15, 12), "clear").waterTempF;
    expect(water(1)).toBeLessThan(45);
    expect(water(4)).toBeGreaterThan(water(1));
    expect(water(7)).toBeGreaterThan(68);
    expect(water(10)).toBeLessThan(water(7));
  });
});
