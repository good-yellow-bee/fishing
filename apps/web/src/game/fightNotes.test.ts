import { afterEach, describe, expect, it } from "vitest";
import { setLang } from "../i18n";
import { fightNotesText } from "./fightNotes";

describe("fight notes", () => {
  afterEach(() => setLang("en"));

  it("lists what went well, and nothing when nothing did", () => {
    expect(fightNotesText(undefined)).toBeNull();
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0 })).toBeNull();
    expect(fightNotesText({ perfectCast: true, hookedSolid: true, turnedRuns: 1 })).toBe("Perfect cast · Hooked solid · Turned 1 run");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 3 })).toBe("Turned 3 runs");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, cleanRun: 1 })).toBeNull();
    expect(fightNotesText({ perfectCast: true, hookedSolid: false, turnedRuns: 0, closeCall: true })).toBe("Close call · Perfect cast");
    expect(fightNotesText({ perfectCast: false, hookedSolid: true, turnedRuns: 0, cleanRun: 3 })).toBe("Hooked solid · 3 clean fights in a row");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 2, fightSec: 23.6 })).toBe("Turned 2 runs · Landed in 24 s");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, fightSec: 0.2 })).toBe("Landed in 1 s");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 1, bowedLeaps: 2 })).toBe("Turned 1 run · Bowed to 2 leaps");
    expect(fightNotesText({ perfectCast: true, hookedSolid: true, turnedRuns: 0, secondTake: true })).toBe("Perfect cast · Hooked solid · On the second take");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, fightSec: 65.2 })).toBe("Landed in 1 min 5 s");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 2, clearOf: "weeds" })).toBe("Turned 2 runs · Kept it out of the weeds");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 2, clearOf: "rocks" })).toBe("Turned 2 runs · Kept it off the rocks");
  });

  it("says it in Polish too", () => {
    setLang("pl");
    expect(fightNotesText({ perfectCast: true, hookedSolid: true, turnedRuns: 5 })).toBe("Idealny rzut · Hak siedzi pewnie · 5 zawróconych odjazdów");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, cleanRun: 2 })).toBe("Czyste hole z rzędu: 2");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, fightSec: 75 })).toBe("Wyholowana w 1 min 15 s");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, bowedLeaps: 5 })).toBe("5 przetrwanych skoków");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, secondTake: true })).toBe("Przy drugim braniu");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, closeCall: true })).toBe("O włos");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, clearOf: "weeds" })).toBe("Z dala od zielska");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, clearOf: "rocks" })).toBe("Z dala od kamieni");
  });
});
