import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import type { Trip } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { isTimePhrase, isTimeWord } from "./CatchSearch";
import { TripMonthHead } from "./TripMonthHead";
import { tripsIcs } from "./tripIcs";

const trip = (id: string, date: string, spotId = "own-lake"): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;

afterEach(() => setLang("en"));

describe("round 88: Find an outing reads a time of day said as a phrase", () => {
  it("as Find a fish reads it, in either language", () => {
    for (const typed of ["at dawn", "in the evening", "at night"]) expect(isTimePhrase(typed, t), typed).toBe(true);
    setLang("pl");
    for (const typed of ["w nocy", "o świcie", "o zmierzchu"]) {
      expect(isTimeWord(typed, t), typed).toBe(false);
      expect(isTimePhrase(typed, t), typed).toBe(true);
    }
    expect(isTimePhrase("szczupak", t)).toBe(false);
  });
});

describe("round 88: a month's heading counts the angler's own outings", () => {
  const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-03"), trip("s1", "2026-10-05", "spot-mill"), trip("g", "2026-10-06", "spot-stillwater")];
  const fishOn = (id: string) => (id === "a" ? 2 : id === "g" ? 3 : 0);

  it("and says the sample week's and the game's apart", () => {
    const html = renderToStaticMarkup(<TripMonthHead month="2026-10" trips={trips} fishOn={fishOn} counted={(each) => ["a", "b"].includes(each.id)} />);
    expect(html).toContain("October 2026 · 2 outings · 2 fish · +2 from the sample week or the game");
  });

  it("names a month of only those as theirs", () => {
    setLang("pl");
    const html = renderToStaticMarkup(<TripMonthHead month="2026-10" trips={trips} fishOn={fishOn} counted={() => false} />);
    expect(html).toContain("4 z przykładowego tygodnia lub z gry");
  });
});

describe("round 88: a calendar reminder only for an outing still to come", () => {
  it("leaves today's outing without one", () => {
    const now = new Date(2026, 9, 19, 10);
    expect(tripsIcs([{ trip: trip("a", "2026-10-19"), place: null, alarm: "Pack" }], now)).not.toContain("VALARM");
    expect(tripsIcs([{ trip: trip("a", "2026-10-20"), place: null, alarm: "Pack" }], now)).toContain("VALARM");
  });
});

describe("round 88 ideas: the outings sheet says what each outing took", () => {
  it("lists the kinds most first, and names an untitled outing by its water", async () => {
    const { tripsCsv } = await import("./catchCsv");
    const fish = (id: string, species: string, tripId: string) =>
      ({ id, species, measure: { kind: "length", inches: 20 }, lure: "Jig", spotId: "own-lake", tripId, caughtAt: new Date(2026, 9, 10, 9).toISOString(), note: "", weather: null }) as never;
    const book = { spots: [{ id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [trip("a", "2026-10-10")], catches: [fish("1", "Zander", "a"), fish("2", "Northern pike", "a"), fish("3", "Zander", "a")] } as never;
    const lines = tripsCsv(book, "2026-10-19").replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines[1]).toBe('2026-10-10,Own Lake,Own Lake,3,"Zander ×2, Northern pike",0,0,');
  });
});
