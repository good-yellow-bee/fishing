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
  });

  it("says it in Polish too", () => {
    setLang("pl");
    expect(fightNotesText({ perfectCast: true, hookedSolid: true, turnedRuns: 5 })).toBe("Idealny rzut · Hak siedzi pewnie · 5 zawróconych odjazdów");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, cleanRun: 2 })).toBe("Czyste hole z rzędu: 2");
    expect(fightNotesText({ perfectCast: false, hookedSolid: false, turnedRuns: 0, closeCall: true })).toBe("O włos");
  });
});
